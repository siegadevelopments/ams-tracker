"""
Attendance API endpoints — start/end shift, breaks, team status.
"""

import uuid
from datetime import date
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import get_current_user, require_permission
from app.database import get_db_session
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCorrectionRequest,
    AttendanceResponse,
    EndShiftRequest,
    StartBreakRequest,
    StartShiftRequest,
    TeamStatusResponse,
)
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _attendance_to_response(record) -> AttendanceResponse:
    shift_type_name = None
    if record.shift_schedule and record.shift_schedule.shift_type:
        shift_type_name = record.shift_schedule.shift_type.name

    return AttendanceResponse(
        id=record.id,
        user_id=record.user_id,
        user_name=record.user.full_name if record.user else "Unknown",
        shift_schedule_id=record.shift_schedule_id,
        shift_type_name=shift_type_name,
        attendance_date=record.attendance_date,
        scheduled_start_utc=record.scheduled_start_utc,
        scheduled_end_utc=record.scheduled_end_utc,
        actual_start_utc=record.actual_start_utc,
        actual_end_utc=record.actual_end_utc,
        late_minutes=record.late_minutes,
        early_departure_minutes=record.early_departure_minutes,
        overtime_minutes=record.overtime_minutes,
        total_break_minutes=record.total_break_minutes,
        status=record.status,
        notes=record.notes,
        correction_requested=record.correction_requested,
        correction_approved=record.correction_approved,
    )


@router.post("/start-shift")
async def start_shift(
    body: StartShiftRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Start shift — 1-click. Auto-detects schedule and calculates lateness."""
    service = AttendanceService(db)
    record = await service.start_shift(
        user=current_user,
        notes=body.notes,
        ip_address=_get_client_ip(request),
    )
    return {"data": _attendance_to_response(record)}


@router.post("/end-shift")
async def end_shift(
    body: EndShiftRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """End shift — calculates overtime and early departure."""
    service = AttendanceService(db)
    record = await service.end_shift(
        user=current_user,
        notes=body.notes,
        ip_address=_get_client_ip(request),
    )
    return {"data": _attendance_to_response(record)}


@router.post("/start-break")
async def start_break(
    body: StartBreakRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Start a break during active shift."""
    service = AttendanceService(db)
    break_record = await service.start_break(
        user=current_user,
        break_type=body.break_type,
        ip_address=_get_client_ip(request),
    )
    return {
        "data": {
            "id": str(break_record.id),
            "start_utc": str(break_record.start_utc),
            "break_type": break_record.break_type,
        }
    }


@router.post("/end-break")
async def end_break(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """End current break."""
    service = AttendanceService(db)
    break_record = await service.end_break(
        user=current_user,
        ip_address=_get_client_ip(request),
    )
    return {
        "data": {
            "id": str(break_record.id),
            "end_utc": str(break_record.end_utc),
            "duration_minutes": break_record.duration_minutes,
        }
    }


@router.get("/current")
async def get_current_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Get current active attendance state for the logged-in user."""
    service = AttendanceService(db)
    record = await service.get_current_attendance(current_user.id)

    if not record:
        return {"data": None, "status": "no_active_shift"}

    return {"data": _attendance_to_response(record), "status": "active"}


@router.get(
    "/team-status",
    dependencies=[Depends(require_permission("attendance.team_status"))],
)
async def get_team_status(
    team_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get live team attendance status.
    Shows who is working, late, not started, absent, on break.
    """
    service = AttendanceService(db)
    status = await service.get_team_status(team_id=team_id)
    return {"data": status}


@router.get(
    "",
    dependencies=[Depends(require_permission("attendance.read_all"))],
)
async def list_attendance(
    start_date: date | None = None,
    end_date: date | None = None,
    user_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    """List attendance records with filtering and pagination."""
    service = AttendanceService(db)
    records, total = await service.list_attendance(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        team_id=team_id,
        status=status,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [_attendance_to_response(r) for r in records],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        },
    }


@router.get("/{attendance_id}")
async def get_attendance_record(
    attendance_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Get a specific attendance record."""
    service = AttendanceService(db)
    record = await service.get_attendance_record(attendance_id)

    # Access control: self or managers
    if record.user_id != current_user.id and current_user.role.name not in (
        "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"
    ):
        from app.core.exceptions import ForbiddenError
        raise ForbiddenError("Access denied")

    return {"data": _attendance_to_response(record)}

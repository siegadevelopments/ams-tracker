"""
Shift scheduling API endpoints.
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
from app.schemas.shift import (
    ShiftScheduleBulkCreate,
    ShiftScheduleCreate,
    ShiftScheduleResponse,
    ShiftScheduleUpdate,
    ShiftTypeCreate,
    ShiftTypeResponse,
    ShiftTypeUpdate,
)
from app.services.shift_service import ShiftService

router = APIRouter(prefix="/api/v1/shifts", tags=["shifts"])


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _shift_type_to_response(st) -> ShiftTypeResponse:
    return ShiftTypeResponse(
        id=st.id,
        name=st.name,
        default_start=st.default_start,
        default_end=st.default_end,
        crosses_midnight=st.crosses_midnight,
        grace_period_minutes=st.grace_period_minutes,
        description=st.description,
        is_active=st.is_active,
    )


def _schedule_to_response(s) -> ShiftScheduleResponse:
    return ShiftScheduleResponse(
        id=s.id,
        user_id=s.user_id,
        user_name=s.user.full_name if s.user else "Unknown",
        shift_type_id=s.shift_type_id,
        shift_type_name=s.shift_type.name if s.shift_type else "Unknown",
        team_id=s.team_id,
        team_name=s.team.name if s.team else None,
        shift_date=s.shift_date,
        scheduled_start=s.scheduled_start,
        scheduled_end=s.scheduled_end,
        crosses_midnight=s.shift_type.crosses_midnight if s.shift_type else False,
        status=s.status,
        schedule_type=s.schedule_type,
        notes=s.notes,
        created_at=s.created_at,
    )


# ─── Shift Types ────────────────────────────────────────────────────────

@router.get("/types")
async def list_shift_types(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List shift types."""
    service = ShiftService(db)
    types = await service.list_shift_types(active_only=active_only)
    return {"data": [_shift_type_to_response(t) for t in types]}


@router.post("/types", dependencies=[Depends(require_permission("settings.manage"))])
async def create_shift_type(
    body: ShiftTypeCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Create a shift type. Admin only."""
    service = ShiftService(db)
    st = await service.create_shift_type(
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _shift_type_to_response(st)}


@router.patch(
    "/types/{shift_type_id}",
    dependencies=[Depends(require_permission("settings.manage"))],
)
async def update_shift_type(
    shift_type_id: uuid.UUID,
    body: ShiftTypeUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Update a shift type. Admin only."""
    service = ShiftService(db)
    st = await service.update_shift_type(
        shift_type_id=shift_type_id,
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _shift_type_to_response(st)}


# ─── Shift Schedules ───────────────────────────────────────────────────

@router.get(
    "/schedules", dependencies=[Depends(require_permission("shifts.read"))]
)
async def list_schedules(
    start_date: date | None = None,
    end_date: date | None = None,
    user_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    """List shift schedules with filters."""
    service = ShiftService(db)
    schedules, total = await service.list_schedules(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        team_id=team_id,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [_schedule_to_response(s) for s in schedules],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        },
    }


@router.post(
    "/schedules", dependencies=[Depends(require_permission("shifts.create"))]
)
async def create_schedule(
    body: ShiftScheduleCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Create a shift schedule assignment."""
    service = ShiftService(db)
    schedule = await service.create_schedule(
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _schedule_to_response(schedule)}


@router.post(
    "/schedules/bulk",
    dependencies=[Depends(require_permission("shifts.create"))],
)
async def create_bulk_schedules(
    body: ShiftScheduleBulkCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Bulk create schedules for multiple employees over a date range."""
    service = ShiftService(db)
    schedules = await service.create_bulk_schedules(
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": {"created_count": len(schedules)}}


@router.get("/my-schedule")
async def get_my_schedule(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Get own schedule."""
    service = ShiftService(db)
    schedules, total = await service.list_schedules(
        start_date=start_date,
        end_date=end_date,
        user_id=current_user.id,
        page=1,
        page_size=100,
    )
    return {"data": [_schedule_to_response(s) for s in schedules]}

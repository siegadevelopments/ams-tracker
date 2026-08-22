"""
Ticket and Shift Activity API endpoints.
"""

import uuid
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import get_current_user
from app.database import get_db_session
from app.models.user import User
from app.schemas.ticket import (
    ShiftActivityCreate,
    ShiftActivityResponse,
    TicketCreate,
    TicketResponse,
    TicketUpdate,
)
from app.services.attendance_service import AttendanceService
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])


def _ticket_to_response(ticket) -> TicketResponse:
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        description=ticket.description,
        ticket_type=ticket.ticket_type,
        priority=ticket.priority,
        status=ticket.status,
        category=ticket.category,
        environment=ticket.environment,
        assignee_id=ticket.assignee_id,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        created_by_id=ticket.created_by_id,
        created_by_name=ticket.created_by.full_name if ticket.created_by else None,
        attendance_id=ticket.attendance_id,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _activity_to_response(act) -> ShiftActivityResponse:
    return ShiftActivityResponse(
        id=act.id,
        attendance_id=act.attendance_id,
        ticket_id=act.ticket_id,
        ticket_number=act.ticket.ticket_number if act.ticket else None,
        activity_type=act.activity_type,
        description=act.description,
        start_time=act.start_time,
        end_time=act.end_time,
        duration_minutes=act.duration_minutes,
        status=act.status,
        notes=act.notes,
        created_at=act.created_at,
    )


@router.get("")
async def list_tickets(
    current_user: Annotated[User, Depends(get_current_user)],
    status: str | None = None,
    priority: str | None = None,
    assignee_id: uuid.UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    """List tickets with filtering and pagination."""
    service = TicketService(db)
    tickets, total = await service.list_tickets(
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [_ticket_to_response(t) for t in tickets],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        },
    }


@router.post("")
async def create_ticket(
    body: TicketCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new ticket. Automatically links active shift if user is currently working."""
    service = TicketService(db)
    att_service = AttendanceService(db)

    # Check active attendance
    current_att = await att_service.get_current_attendance(current_user.id)
    att_id = current_att.id if current_att else None

    ticket = await service.create_ticket(
        data=body,
        creator=current_user,
        attendance_id=att_id,
    )
    return {"data": _ticket_to_response(ticket)}


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Get ticket by ID."""
    service = TicketService(db)
    ticket = await service.get_ticket_by_id(ticket_id)
    return {"data": _ticket_to_response(ticket)}


@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Update ticket attributes."""
    service = TicketService(db)
    ticket = await service.update_ticket(ticket_id, body)
    return {"data": _ticket_to_response(ticket)}


@router.post("/activities")
async def log_activity(
    body: ShiftActivityCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Log an activity performed during an active shift."""
    service = TicketService(db)
    att_service = AttendanceService(db)

    current_att = await att_service.get_current_attendance(current_user.id)
    if not current_att:
        from app.core.exceptions import ValidationError
        raise ValidationError("You must have an active shift to log shift activities.")

    activity = await service.log_shift_activity(
        user=current_user,
        data=body,
        attendance_id=current_att.id,
    )
    return {"data": _activity_to_response(activity)}


@router.get("/activities/current")
async def get_current_shift_activities(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Get all activities for current active shift."""
    service = TicketService(db)
    att_service = AttendanceService(db)

    current_att = await att_service.get_current_attendance(current_user.id)
    if not current_att:
        return {"data": []}

    activities = await service.list_shift_activities(current_att.id)
    return {"data": [_activity_to_response(a) for a in activities]}

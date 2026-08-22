"""
Ticket and ShiftActivity domain service.
"""

import uuid
from datetime import datetime, timezone
from math import ceil
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.models.attendance import AttendanceRecord
from app.models.ticket import ShiftActivity, Ticket
from app.models.user import User
from app.schemas.ticket import ShiftActivityCreate, TicketCreate, TicketUpdate


class TicketService:
    """Service handling tickets and shift activity operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_ticket_number(self) -> str:
        """Generate auto-incrementing ticket number e.g. TCK-1001."""
        result = await self.db.execute(select(func.count(Ticket.id)))
        count = result.scalar_one()
        return f"TCK-{1001 + count}"

    async def create_ticket(
        self,
        data: TicketCreate,
        creator: User,
        attendance_id: uuid.UUID | None = None,
    ) -> Ticket:
        """Create a new ticket and optionally link to active shift."""
        ticket_num = await self.generate_ticket_number()

        ticket = Ticket(
            ticket_number=ticket_num,
            title=data.title,
            description=data.description,
            ticket_type=data.ticket_type,
            priority=data.priority,
            status="OPEN",
            category=data.category,
            environment=data.environment,
            assignee_id=data.assignee_id or creator.id,
            created_by_id=creator.id,
            attendance_id=attendance_id,
        )

        self.db.add(ticket)
        await self.db.flush()
        return ticket

    async def list_tickets(
        self,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: uuid.UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Ticket], int]:
        """List tickets with optional status, priority, assignee, and search filters."""
        query = select(Ticket)

        if status:
            query = query.where(Ticket.status == status)
        if priority:
            query = query.where(Ticket.priority == priority)
        if assignee_id:
            query = query.where(Ticket.assignee_id == assignee_id)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (Ticket.title.ilike(search_term))
                | (Ticket.ticket_number.ilike(search_term))
                | (Ticket.description.ilike(search_term))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Paginate
        query = (
            query.order_by(Ticket.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        tickets = result.scalars().all()

        return tickets, total

    async def get_ticket_by_id(self, ticket_id: uuid.UUID) -> Ticket:
        """Get ticket by UUID."""
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await self.db.execute(query)
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundError(f"Ticket with ID '{ticket_id}' not found")
        return ticket

    async def update_ticket(self, ticket_id: uuid.UUID, data: TicketUpdate) -> Ticket:
        """Update ticket attributes and update resolved_at if status changes to RESOLVED/CLOSED."""
        ticket = await self.get_ticket_by_id(ticket_id)

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(ticket, key, value)

        if data.status in ("RESOLVED", "CLOSED") and not ticket.resolved_at:
            ticket.resolved_at = datetime.now(timezone.utc)

        await self.db.flush()
        return ticket

    async def log_shift_activity(
        self,
        user: User,
        data: ShiftActivityCreate,
        attendance_id: uuid.UUID,
    ) -> ShiftActivity:
        """Log an activity performed during an active shift."""
        # Verify attendance record exists
        att_query = select(AttendanceRecord).where(AttendanceRecord.id == attendance_id)
        att_result = await self.db.execute(att_query)
        att = att_result.scalar_one_or_none()
        if not att:
            raise NotFoundError("Active shift attendance record not found")

        activity = ShiftActivity(
            attendance_id=attendance_id,
            ticket_id=data.ticket_id,
            activity_type=data.activity_type,
            description=data.description,
            duration_minutes=data.duration_minutes,
            status="COMPLETED",
            notes=data.notes,
        )

        self.db.add(activity)
        await self.db.flush()
        return activity

    async def list_shift_activities(
        self, attendance_id: uuid.UUID
    ) -> Sequence[ShiftActivity]:
        """List all activities for a given shift attendance record."""
        query = (
            select(ShiftActivity)
            .where(ShiftActivity.attendance_id == attendance_id)
            .order_by(ShiftActivity.start_time.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

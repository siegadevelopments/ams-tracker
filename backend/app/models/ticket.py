"""
Ticket and ShiftActivity ORM models.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.attendance import AttendanceRecord
    from app.models.user import User


class Ticket(Base, TimestampMixin):
    """
    Represents an operational ticket (Incident, Request, Problem, Change, etc.).
    Can be assigned to a user and linked to an active shift.
    """

    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    ticket_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    ticket_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="INCIDENT", index=True
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, default="P3", index=True
    )  # P1, P2, P3, P4
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="OPEN", index=True
    )  # OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    environment: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="PROD"
    )

    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    attendance_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_records.id"), nullable=True, index=True
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    assignee: Mapped["User | None"] = relationship(
        "User", foreign_keys=[assignee_id], lazy="joined"
    )
    created_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[created_by_id], lazy="joined"
    )
    attendance: Mapped["AttendanceRecord | None"] = relationship(
        "AttendanceRecord", lazy="selectin"
    )
    activities: Mapped[list["ShiftActivity"]] = relationship(
        "ShiftActivity", back_populates="ticket", cascade="all, delete-orphan"
    )


class ShiftActivity(Base, TimestampMixin):
    """
    Logs work activities performed during an employee shift.
    Optionally linked to a ticket.
    """

    __tablename__ = "shift_activities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    attendance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True, index=True
    )

    activity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="INCIDENT", index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="COMPLETED"
    )  # IN_PROGRESS, COMPLETED, PAUSED
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    attendance: Mapped["AttendanceRecord"] = relationship(
        "AttendanceRecord", lazy="joined"
    )
    ticket: Mapped["Ticket | None"] = relationship(
        "Ticket", back_populates="activities", lazy="joined"
    )

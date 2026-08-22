"""
AttendanceRecord and BreakRecord ORM models.
All timestamps stored in UTC. Display conversion happens in the API/UI layer.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin, generate_uuid


class AttendanceRecord(Base, TimestampMixin):
    """
    Records an employee's attendance for a single shift.
    Status is computed from scheduled vs actual times.
    """

    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    shift_schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shift_schedules.id"),
        nullable=True,
    )
    attendance_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )

    # Scheduled times (UTC)
    scheduled_start_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scheduled_end_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Actual times (UTC)
    actual_start_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_end_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Computed fields
    late_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    early_departure_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    overtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_break_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="MISSING_LOG", index=True
    )

    # Notes & corrections
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction_requested: Mapped[bool] = mapped_column(default=False)
    correction_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction_approved: Mapped[bool | None] = mapped_column(nullable=True)
    correction_approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], lazy="joined"
    )
    shift_schedule: Mapped["ShiftSchedule | None"] = relationship(
        "ShiftSchedule", back_populates="attendance_records", lazy="joined"
    )
    breaks: Mapped[list["BreakRecord"]] = relationship(
        "BreakRecord", back_populates="attendance", cascade="all, delete-orphan"
    )


class BreakRecord(Base):
    """Records individual breaks within a shift."""

    __tablename__ = "break_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    attendance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    break_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="REST"
    )

    # Relationships
    attendance: Mapped["AttendanceRecord"] = relationship(
        "AttendanceRecord", back_populates="breaks"
    )

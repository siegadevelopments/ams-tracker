"""
ShiftType and ShiftSchedule ORM models.
Handles cross-midnight shifts (e.g., 22:00–06:00) as a single shift record.
"""

import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin, generate_uuid


class ShiftType(Base, TimestampMixin):
    """
    Reusable shift definition (e.g., Morning, Afternoon, Night).
    crosses_midnight=True for night shifts like 22:00–06:00.
    """

    __tablename__ = "shift_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    default_start: Mapped[time] = mapped_column(Time, nullable=False)
    default_end: Mapped[time] = mapped_column(Time, nullable=False)
    crosses_midnight: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    grace_period_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=15
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    schedules: Mapped[list["ShiftSchedule"]] = relationship(
        "ShiftSchedule", back_populates="shift_type"
    )


class ShiftSchedule(Base, TimestampMixin):
    """
    An individual shift assignment for an employee on a specific date.
    shift_date is the anchor date (the date the shift starts on).
    """

    __tablename__ = "shift_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    shift_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shift_types.id"), nullable=False
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True
    )
    shift_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scheduled_start: Mapped[time] = mapped_column(Time, nullable=False)
    scheduled_end: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="SCHEDULED"
    )
    schedule_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="MANUAL"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], lazy="joined"
    )
    shift_type: Mapped["ShiftType"] = relationship(
        "ShiftType", back_populates="schedules", lazy="joined"
    )
    team: Mapped["Team | None"] = relationship("Team", lazy="joined")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="shift_schedule"
    )

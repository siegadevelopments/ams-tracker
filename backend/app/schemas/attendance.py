"""
Attendance request/response schemas.
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import AttendanceStatus


class StartShiftRequest(BaseModel):
    """Employee starts their shift. Minimal input — mostly auto-detected."""

    notes: str | None = None


class EndShiftRequest(BaseModel):
    """Employee ends their shift."""

    notes: str | None = None


class StartBreakRequest(BaseModel):
    """Start a break."""

    break_type: str = "REST"


class EndBreakRequest(BaseModel):
    """End current break."""
    pass


class AttendanceCorrectionRequest(BaseModel):
    """Request a correction to attendance record."""

    actual_start_utc: datetime | None = None
    actual_end_utc: datetime | None = None
    reason: str = Field(..., min_length=10, max_length=500)


class AttendanceResponse(BaseModel):
    """Attendance record in API responses."""

    id: UUID
    user_id: UUID
    user_name: str
    shift_schedule_id: UUID | None
    shift_type_name: str | None
    attendance_date: date
    scheduled_start_utc: datetime | None
    scheduled_end_utc: datetime | None
    actual_start_utc: datetime | None
    actual_end_utc: datetime | None
    late_minutes: int
    early_departure_minutes: int
    overtime_minutes: int
    total_break_minutes: int
    status: str
    notes: str | None
    correction_requested: bool
    correction_approved: bool | None

    model_config = {"from_attributes": True}


class TeamStatusEntry(BaseModel):
    """Single employee's current status for team status view."""

    user_id: UUID
    user_name: str
    employee_id: str | None
    shift_type: str | None
    scheduled_start: datetime | None
    actual_start: datetime | None
    status: str  # WORKING, LATE, NOT_STARTED, ON_BREAK, OFF_DUTY, ABSENT
    late_minutes: int
    current_activity: str | None = None


class TeamStatusResponse(BaseModel):
    """Team attendance status overview."""

    total_scheduled: int
    active: int
    late: int
    not_started: int
    absent: int
    on_break: int
    employees: list[TeamStatusEntry]


class AttendanceFilter(BaseModel):
    """Filters for attendance list queries."""

    start_date: date | None = None
    end_date: date | None = None
    user_id: UUID | None = None
    team_id: UUID | None = None
    status: AttendanceStatus | None = None

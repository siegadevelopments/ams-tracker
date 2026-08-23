"""
Shift type and shift schedule request/response schemas.
"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import ScheduleType, ShiftScheduleStatus


class ShiftTypeCreate(BaseModel):
    """Create a shift type."""

    name: str = Field(..., min_length=1, max_length=100)
    default_start: time
    default_end: time
    crosses_midnight: bool = False
    grace_period_minutes: int = Field(default=15, ge=0, le=120)
    description: str | None = None


class ShiftTypeUpdate(BaseModel):
    """Update a shift type."""

    name: str | None = Field(default=None, max_length=100)
    default_start: time | None = None
    default_end: time | None = None
    crosses_midnight: bool | None = None
    grace_period_minutes: int | None = Field(default=None, ge=0, le=120)
    description: str | None = None
    is_active: bool | None = None


class ShiftTypeResponse(BaseModel):
    """Shift type in responses."""

    id: UUID
    name: str
    default_start: time
    default_end: time
    crosses_midnight: bool
    grace_period_minutes: int
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class ShiftScheduleCreate(BaseModel):
    """Create a shift schedule assignment."""

    user_id: UUID
    shift_type_id: UUID
    team_id: UUID | None = None
    shift_date: date
    scheduled_start: time | None = None  # Defaults to shift type's default
    scheduled_end: time | None = None
    schedule_type: ScheduleType = ScheduleType.MANUAL
    notes: str | None = None


class ShiftScheduleBulkCreate(BaseModel):
    """Bulk create schedules for multiple employees."""

    user_ids: list[UUID]
    shift_type_id: UUID
    team_id: UUID | None = None
    start_date: date
    end_date: date
    exclude_dates: list[date] = []
    schedule_type: ScheduleType = ScheduleType.MANUAL
    notes: str | None = None


class ShiftScheduleUpdate(BaseModel):
    """Update a shift schedule."""

    shift_type_id: UUID | None = None
    scheduled_start: time | None = None
    scheduled_end: time | None = None
    status: ShiftScheduleStatus | None = None
    notes: str | None = None


class ShiftScheduleResponse(BaseModel):
    """Shift schedule in responses."""

    id: UUID
    user_id: UUID
    user_name: str
    shift_type_id: UUID
    shift_type_name: str
    team_id: UUID | None
    team_name: str | None
    shift_date: date
    scheduled_start: time
    scheduled_end: time
    crosses_midnight: bool
    status: str
    schedule_type: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

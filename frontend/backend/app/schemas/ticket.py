"""
Ticket and ShiftActivity request/response schemas.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    """Payload for creating a new ticket."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    ticket_type: str = "INCIDENT"
    priority: str = "P3"
    category: str | None = None
    environment: str = "PROD"
    assignee_id: uuid.UUID | None = None


class TicketUpdate(BaseModel):
    """Payload for updating an existing ticket."""

    title: str | None = None
    description: str | None = None
    ticket_type: str | None = None
    priority: str | None = None
    status: str | None = None
    category: str | None = None
    environment: str | None = None
    assignee_id: uuid.UUID | None = None


class ShiftActivityCreate(BaseModel):
    """Payload for logging a shift activity."""

    activity_type: str = "INCIDENT"
    description: str = Field(..., min_length=1)
    ticket_id: uuid.UUID | None = None
    duration_minutes: int | None = None
    notes: str | None = None


class ShiftActivityResponse(BaseModel):
    """Response schema for shift activities."""

    id: uuid.UUID
    attendance_id: uuid.UUID
    ticket_id: uuid.UUID | None
    ticket_number: str | None = None
    activity_type: str
    description: str
    start_time: datetime
    end_time: datetime | None
    duration_minutes: int | None
    status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketResponse(BaseModel):
    """Response schema for tickets."""

    id: uuid.UUID
    ticket_number: str
    title: str
    description: str | None
    ticket_type: str
    priority: str
    status: str
    category: str | None
    environment: str | None
    assignee_id: uuid.UUID | None
    assignee_name: str | None = None
    created_by_id: uuid.UUID | None
    created_by_name: str | None = None
    attendance_id: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}

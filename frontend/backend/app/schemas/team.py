"""
Team CRUD request/response schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TeamCreate(BaseModel):
    """Create a team."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    manager_id: UUID | None = None


class TeamUpdate(BaseModel):
    """Update a team."""

    name: str | None = Field(default=None, max_length=100)
    description: str | None = None
    manager_id: UUID | None = None
    is_active: bool | None = None


class TeamMemberAdd(BaseModel):
    """Add a member to a team."""

    user_id: UUID
    role_in_team: str = "MEMBER"


class TeamMemberResponse(BaseModel):
    """Team member in response."""

    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    role_in_team: str
    is_active: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    """Team detail in API responses."""

    id: UUID
    name: str
    description: str | None
    manager_id: UUID | None
    manager_name: str | None
    is_active: bool
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamDetailResponse(TeamResponse):
    """Team with full member list."""

    members: list[TeamMemberResponse] = []

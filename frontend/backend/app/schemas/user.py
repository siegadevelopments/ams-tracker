"""
User CRUD request/response schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserRole


class UserCreate(BaseModel):
    """Create a new user."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    employee_id: str | None = Field(default=None, max_length=50)
    role: UserRole = UserRole.AGENT
    timezone: str = "Asia/Manila"


class UserUpdate(BaseModel):
    """Update an existing user."""

    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    employee_id: str | None = Field(default=None, max_length=50)
    timezone: str | None = None


class UserRoleUpdate(BaseModel):
    """Change a user's role."""

    role: UserRole


class UserResponse(BaseModel):
    """User detail in API responses."""

    id: UUID
    email: str
    first_name: str
    last_name: str
    full_name: str
    employee_id: str | None
    role_name: str
    timezone: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListItem(BaseModel):
    """Compact user representation for lists."""

    id: UUID
    email: str
    full_name: str
    employee_id: str | None
    role_name: str
    is_active: bool

    model_config = {"from_attributes": True}

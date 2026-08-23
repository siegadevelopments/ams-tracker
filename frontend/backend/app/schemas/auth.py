"""
Authentication request/response schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login credentials."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """JWT token pair."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    """Token refresh request."""

    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Password change request."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class CurrentUserResponse(BaseModel):
    """Current authenticated user profile."""

    id: UUID
    email: str
    first_name: str
    last_name: str
    employee_id: str | None
    role: str
    timezone: str
    is_active: bool

    model_config = {"from_attributes": True}

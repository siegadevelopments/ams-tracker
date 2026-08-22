"""
Common schemas: pagination, error responses, and shared types.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for paginated endpoints."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginationMeta(BaseModel):
    """Pagination metadata in response."""

    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response wrapper."""

    data: list[T]
    pagination: PaginationMeta


class ErrorDetail(BaseModel):
    """Structured error response."""

    code: str
    message: str
    details: list[str] = []


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: ErrorDetail


class SuccessResponse(BaseModel):
    """Simple success response."""

    message: str


class TimestampSchema(BaseModel):
    """Mixin for created_at / updated_at fields."""

    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

"""
User management API endpoints.
"""

import uuid
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import get_current_user, require_permission
from app.database import get_db_session
from app.models.user import User
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.user import (
    UserCreate,
    UserListItem,
    UserResponse,
    UserRoleUpdate,
    UserUpdate,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        employee_id=user.employee_id,
        role_name=user.role.name,
        timezone=user.timezone,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _user_to_list_item(user: User) -> UserListItem:
    return UserListItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        employee_id=user.employee_id,
        role_name=user.role.name,
        is_active=user.is_active,
    )


@router.get("", dependencies=[Depends(require_permission("users.read"))])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    role: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """List users with filtering and pagination."""
    service = UserService(db)
    users, total = await service.list_users(
        page=page, page_size=page_size, is_active=is_active, role=role, search=search
    )
    return {
        "data": [_user_to_list_item(u) for u in users],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        },
    }


@router.post("", dependencies=[Depends(require_permission("users.create"))])
async def create_user(
    body: UserCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new user."""
    service = UserService(db)
    user = await service.create_user(
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _user_to_response(user)}


@router.get("/{user_id}")
async def get_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Get user detail. Users can view themselves; managers/admins can view anyone."""
    # Self-access is always allowed
    if current_user.id != user_id and current_user.role.name not in (
        "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"
    ):
        from app.core.exceptions import ForbiddenError
        raise ForbiddenError("You can only view your own profile")

    service = UserService(db)
    user = await service.get_user(user_id)
    return {"data": _user_to_response(user)}


@router.patch(
    "/{user_id}", dependencies=[Depends(require_permission("users.update"))]
)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Update user details."""
    service = UserService(db)
    user = await service.update_user(
        user_id=user_id,
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _user_to_response(user)}


@router.patch(
    "/{user_id}/role",
    dependencies=[Depends(require_permission("users.change_role"))],
)
async def change_user_role(
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Change a user's system role."""
    service = UserService(db)
    user = await service.change_role(
        user_id=user_id,
        new_role=body.role,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _user_to_response(user)}


@router.patch(
    "/{user_id}/deactivate",
    dependencies=[Depends(require_permission("users.deactivate"))],
)
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Soft-deactivate a user."""
    service = UserService(db)
    user = await service.deactivate_user(
        user_id=user_id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": _user_to_response(user)}

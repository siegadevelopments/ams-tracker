"""
Role-Based Access Control (RBAC) enforcement.
All authorization is server-side. Never trust frontend role claims.
"""

import uuid
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.database import get_db_session

settings = get_settings()


async def get_current_user_id(request: Request) -> uuid.UUID:
    """
    Extract and validate the current user ID from the JWT token.
    Token can be in Authorization header or HTTP-only cookie.
    """
    token = None

    # Try Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # Fallback to HTTP-only cookie
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise UnauthorizedError("Authentication required")

    payload = decode_token(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    try:
        return uuid.UUID(user_id)
    except ValueError:
        raise UnauthorizedError("Invalid token payload")


async def get_current_user(
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Load the full current user from the database.
    Imported here to avoid circular imports — models loaded lazily.
    """
    from app.models.user import User

    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User not found or inactive")

    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory: require the current user to have one of the specified roles.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_roles("SUPER_ADMIN"))])
    """

    async def _check_role(
        user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ):
        from app.models.user import User

        result = await db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id, User.is_active == True)  # noqa: E712
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedError("User not found or inactive")

        if user.role.name not in allowed_roles:
            raise ForbiddenError(
                f"This action requires one of: {', '.join(allowed_roles)}"
            )

        return user

    return _check_role


def require_permission(permission_code: str):
    """
    Dependency factory: require the current user's role to have a specific permission.

    Usage:
        @router.post("/users", dependencies=[Depends(require_permission("users.create"))])
    """

    async def _check_permission(
        user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ):
        from app.models.user import Permission, Role, RolePermission, User

        result = await db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id, User.is_active == True)  # noqa: E712
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedError("User not found or inactive")

        # Super admin bypasses permission checks
        if user.role.name == "SUPER_ADMIN":
            return user

        # Check if role has the required permission
        perm_result = await db.execute(
            select(Permission)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(
                RolePermission.role_id == user.role_id,
                Permission.code == permission_code,
            )
        )
        permission = perm_result.scalar_one_or_none()

        if not permission:
            raise ForbiddenError(
                f"Missing required permission: {permission_code}"
            )

        return user

    return _check_permission


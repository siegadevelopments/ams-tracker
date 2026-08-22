"""
Authentication service — login, token management, password operations.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.enums import AuditAction
from app.core.exceptions import UnauthorizedError, ValidationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models.user import User
from app.services.audit_service import AuditService

settings = get_settings()


class AuthService:
    """Handles authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def login(
        self, email: str, password: str, ip_address: str | None = None
    ) -> dict:
        """
        Authenticate user and return token pair.
        Raises UnauthorizedError on failure.
        """
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("Account is deactivated")

        # Create tokens
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.name,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Audit
        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.USER_LOGIN,
            entity_type="user",
            entity_id=user.id,
            description=f"User {user.email} logged in",
            ip_address=ip_address,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def refresh_token(self, refresh_token_str: str) -> dict:
        """Issue a new access token from a valid refresh token."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid or expired refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token payload")

        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == uuid.UUID(user_id), User.is_active == True)  # noqa: E712
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedError("User not found or inactive")

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.name,
        }
        new_access_token = create_access_token(token_data)

        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token_str,  # Reuse existing refresh token
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
        ip_address: str | None = None,
    ) -> None:
        """Change user's password after verifying current password."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedError("User not found")

        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedError("Current password is incorrect")

        # Validate new password strength
        errors = validate_password_strength(new_password)
        if errors:
            raise ValidationError("Password does not meet requirements", details=errors)

        user.password_hash = hash_password(new_password)

        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.PASSWORD_CHANGED,
            entity_type="user",
            entity_id=user.id,
            description="Password changed",
            ip_address=ip_address,
        )

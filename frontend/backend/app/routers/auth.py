"""
Authentication API endpoints.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import get_current_user
from app.database import get_db_session
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str | None:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """Authenticate and receive JWT tokens."""
    service = AuthService(db)
    result = await service.login(
        email=body.email,
        password=body.password,
        ip_address=_get_client_ip(request),
    )

    # Also set HTTP-only cookie for CSRF-safe browser access
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        max_age=result["expires_in"],
    )

    return result


@router.post("/logout")
async def logout(response: Response):
    """Clear authentication cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """Refresh access token."""
    service = AuthService(db)
    result = await service.refresh_token(body.refresh_token)

    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=result["expires_in"],
    )

    return result


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_profile(
    user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user's profile."""
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        employee_id=user.employee_id,
        role=user.role.name,
        timezone=user.timezone,
        is_active=user.is_active,
    )


@router.post("/password/change")
async def change_password(
    body: PasswordChangeRequest,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Change own password."""
    service = AuthService(db)
    await service.change_password(
        user_id=user.id,
        current_password=body.current_password,
        new_password=body.new_password,
        ip_address=_get_client_ip(request),
    )
    return {"message": "Password changed successfully"}

"""
Team management API endpoints.
"""

import uuid
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import get_current_user, require_permission
from app.database import get_db_session
from app.models.user import User
from app.schemas.team import (
    TeamCreate,
    TeamDetailResponse,
    TeamMemberAdd,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
)
from app.services.team_service import TeamService

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _team_to_response(team) -> TeamResponse:
    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        manager_id=team.manager_id,
        manager_name=team.manager.full_name if team.manager else None,
        is_active=team.is_active,
        member_count=len([m for m in team.members if m.is_active]) if hasattr(team, "members") and team.members else 0,
        created_at=team.created_at,
    )


def _team_to_detail(team) -> TeamDetailResponse:
    members = []
    if hasattr(team, "members") and team.members:
        for m in team.members:
            if m.is_active:
                members.append(
                    TeamMemberResponse(
                        id=m.id,
                        user_id=m.user_id,
                        user_name=m.user.full_name if m.user else "Unknown",
                        user_email=m.user.email if m.user else "",
                        role_in_team=m.role_in_team,
                        is_active=m.is_active,
                        joined_at=m.joined_at,
                    )
                )

    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        manager_id=team.manager_id,
        manager_name=team.manager.full_name if team.manager else None,
        is_active=team.is_active,
        member_count=len(members),
        created_at=team.created_at,
        members=members,
    )


@router.get("")
async def list_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List teams."""
    service = TeamService(db)
    teams, total = await service.list_teams(
        page=page, page_size=page_size, is_active=is_active
    )
    return {
        "data": [_team_to_response(t) for t in teams],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        },
    }


@router.post(
    "", dependencies=[Depends(require_permission("teams.create"))]
)
async def create_team(
    body: TeamCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new team."""
    service = TeamService(db)
    team = await service.create_team(
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": {"id": str(team.id), "name": team.name}}


@router.get("/{team_id}")
async def get_team(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get team detail with members."""
    service = TeamService(db)
    team = await service.get_team(team_id)
    return {"data": _team_to_detail(team)}


@router.patch(
    "/{team_id}", dependencies=[Depends(require_permission("teams.update"))]
)
async def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Update team details."""
    service = TeamService(db)
    team = await service.update_team(
        team_id=team_id,
        data=body,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": {"id": str(team.id), "name": team.name}}


@router.post(
    "/{team_id}/members",
    dependencies=[Depends(require_permission("teams.manage_members"))],
)
async def add_team_member(
    team_id: uuid.UUID,
    body: TeamMemberAdd,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Add a member to a team."""
    service = TeamService(db)
    member = await service.add_member(
        team_id=team_id,
        user_id=body.user_id,
        role_in_team=body.role_in_team,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"data": {"id": str(member.id), "user_id": str(body.user_id)}}


@router.delete(
    "/{team_id}/members/{user_id}",
    dependencies=[Depends(require_permission("teams.manage_members"))],
)
async def remove_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db_session),
):
    """Remove a member from a team."""
    service = TeamService(db)
    await service.remove_member(
        team_id=team_id,
        user_id=user_id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        ip_address=_get_client_ip(request),
    )
    return {"message": "Member removed"}

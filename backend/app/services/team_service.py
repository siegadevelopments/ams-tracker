"""
Team management service — CRUD, member management.
"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AuditAction
from app.core.exceptions import ConflictError, NotFoundError
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.team import TeamCreate, TeamUpdate
from app.services.audit_service import AuditService


class TeamService:
    """Manages teams and team membership."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def create_team(
        self,
        data: TeamCreate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> Team:
        """Create a new team."""
        # Check name uniqueness
        existing = await self.db.execute(
            select(Team).where(Team.name == data.name)
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Team '{data.name}' already exists")

        # Validate manager exists if specified
        if data.manager_id:
            manager = await self.db.execute(
                select(User).where(User.id == data.manager_id, User.is_active == True)  # noqa: E712
            )
            if not manager.scalar_one_or_none():
                raise NotFoundError("Manager user", str(data.manager_id))

        team = Team(
            name=data.name,
            description=data.description,
            manager_id=data.manager_id,
        )
        self.db.add(team)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.TEAM_CREATED,
            entity_type="team",
            entity_id=team.id,
            after_value={"name": team.name, "manager_id": str(data.manager_id) if data.manager_id else None},
            ip_address=ip_address,
        )

        return team

    async def get_team(self, team_id: uuid.UUID) -> Team:
        """Get team by ID with members."""
        result = await self.db.execute(
            select(Team)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.manager),
            )
            .where(Team.id == team_id)
        )
        team = result.scalar_one_or_none()
        if not team:
            raise NotFoundError("Team", str(team_id))
        return team

    async def list_teams(
        self,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
    ) -> tuple[list[Team], int]:
        """List teams with pagination."""
        query = select(Team).options(selectinload(Team.manager))
        count_query = select(func.count(Team.id))

        if is_active is not None:
            query = query.where(Team.is_active == is_active)
            count_query = count_query.where(Team.is_active == is_active)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        query = query.order_by(Team.name).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        teams = list(result.scalars().all())

        return teams, total

    async def update_team(
        self,
        team_id: uuid.UUID,
        data: TeamUpdate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> Team:
        """Update team details."""
        team = await self.get_team(team_id)

        before = {"name": team.name, "description": team.description, "is_active": team.is_active}

        if data.name is not None:
            # Check uniqueness
            existing = await self.db.execute(
                select(Team).where(Team.name == data.name, Team.id != team_id)
            )
            if existing.scalar_one_or_none():
                raise ConflictError(f"Team '{data.name}' already exists")
            team.name = data.name
        if data.description is not None:
            team.description = data.description
        if data.manager_id is not None:
            team.manager_id = data.manager_id
        if data.is_active is not None:
            team.is_active = data.is_active

        after = {"name": team.name, "description": team.description, "is_active": team.is_active}

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.TEAM_UPDATED,
            entity_type="team",
            entity_id=team.id,
            before_value=before,
            after_value=after,
            ip_address=ip_address,
        )

        return team

    async def add_member(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        role_in_team: str = "MEMBER",
        actor_id: uuid.UUID | None = None,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> TeamMember:
        """Add a user to a team."""
        # Verify team exists
        await self.get_team(team_id)

        # Verify user exists
        user_result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))

        # Check if already a member
        existing = await self.db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
                TeamMember.is_active == True,  # noqa: E712
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"User is already an active member of this team")

        member = TeamMember(
            team_id=team_id,
            user_id=user_id,
            role_in_team=role_in_team,
        )
        self.db.add(member)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.TEAM_MEMBER_ADDED,
            entity_type="team_member",
            entity_id=member.id,
            after_value={
                "team_id": str(team_id),
                "user_id": str(user_id),
                "user_email": user.email,
                "role_in_team": role_in_team,
            },
            ip_address=ip_address,
        )

        return member

    async def remove_member(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        actor_id: uuid.UUID | None = None,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Soft-remove a member from a team."""
        result = await self.db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
                TeamMember.is_active == True,  # noqa: E712
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Team member")

        member.is_active = False

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.TEAM_MEMBER_REMOVED,
            entity_type="team_member",
            entity_id=member.id,
            before_value={"user_id": str(user_id), "is_active": True},
            after_value={"user_id": str(user_id), "is_active": False},
            ip_address=ip_address,
        )

    async def get_user_teams(self, user_id: uuid.UUID) -> list[Team]:
        """Get all active teams a user belongs to."""
        result = await self.db.execute(
            select(Team)
            .join(TeamMember)
            .where(
                TeamMember.user_id == user_id,
                TeamMember.is_active == True,  # noqa: E712
                Team.is_active == True,  # noqa: E712
            )
        )
        return list(result.scalars().all())

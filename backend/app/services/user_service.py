"""
User management service — CRUD, role changes, deactivation.
"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AuditAction, UserRole
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password, validate_password_strength
from app.models.user import Role, User
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import AuditService


class UserService:
    """Manages user lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def create_user(
        self,
        data: UserCreate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> User:
        """Create a new user with validation."""
        # Validate password
        errors = validate_password_strength(data.password)
        if errors:
            raise ValidationError("Password does not meet requirements", details=errors)

        # Check email uniqueness
        existing = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Email '{data.email}' is already registered")

        # Check employee_id uniqueness
        if data.employee_id:
            existing_emp = await self.db.execute(
                select(User).where(User.employee_id == data.employee_id)
            )
            if existing_emp.scalar_one_or_none():
                raise ConflictError(
                    f"Employee ID '{data.employee_id}' is already in use"
                )

        # Get role
        role_result = await self.db.execute(
            select(Role).where(Role.name == data.role.value)
        )
        role = role_result.scalar_one_or_none()
        if not role:
            raise NotFoundError("Role", data.role.value)

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            employee_id=data.employee_id,
            role_id=role.id,
            timezone=data.timezone,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user, attribute_names=["role"])

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.USER_CREATED,
            entity_type="user",
            entity_id=user.id,
            after_value={
                "email": user.email,
                "name": user.full_name,
                "role": data.role.value,
            },
            ip_address=ip_address,
        )

        return user

    async def get_user(self, user_id: uuid.UUID) -> User:
        """Get user by ID."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
        role: str | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        """List users with filtering and pagination."""
        query = select(User).options(selectinload(User.role))
        count_query = select(func.count(User.id))

        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        if role:
            query = query.join(Role).where(Role.name == role)
            count_query = count_query.join(Role).where(Role.name == role)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (User.email.ilike(search_filter))
                | (User.first_name.ilike(search_filter))
                | (User.last_name.ilike(search_filter))
            )
            count_query = count_query.where(
                (User.email.ilike(search_filter))
                | (User.first_name.ilike(search_filter))
                | (User.last_name.ilike(search_filter))
            )

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        query = query.order_by(User.last_name, User.first_name).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def update_user(
        self,
        user_id: uuid.UUID,
        data: UserUpdate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> User:
        """Update user details."""
        user = await self.get_user(user_id)

        before = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "employee_id": user.employee_id,
            "timezone": user.timezone,
        }

        if data.first_name is not None:
            user.first_name = data.first_name
        if data.last_name is not None:
            user.last_name = data.last_name
        if data.employee_id is not None:
            # Check uniqueness
            existing = await self.db.execute(
                select(User).where(
                    User.employee_id == data.employee_id, User.id != user_id
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictError(f"Employee ID '{data.employee_id}' already in use")
            user.employee_id = data.employee_id
        if data.timezone is not None:
            user.timezone = data.timezone

        after = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "employee_id": user.employee_id,
            "timezone": user.timezone,
        }

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.USER_UPDATED,
            entity_type="user",
            entity_id=user.id,
            before_value=before,
            after_value=after,
            ip_address=ip_address,
        )

        return user

    async def change_role(
        self,
        user_id: uuid.UUID,
        new_role: UserRole,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> User:
        """Change a user's system role."""
        user = await self.get_user(user_id)
        old_role = user.role.name

        role_result = await self.db.execute(
            select(Role).where(Role.name == new_role.value)
        )
        role = role_result.scalar_one_or_none()
        if not role:
            raise NotFoundError("Role", new_role.value)

        user.role_id = role.id
        await self.db.flush()
        await self.db.refresh(user, attribute_names=["role"])

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.USER_ROLE_CHANGED,
            entity_type="user",
            entity_id=user.id,
            before_value={"role": old_role},
            after_value={"role": new_role.value},
            ip_address=ip_address,
        )

        return user

    async def deactivate_user(
        self,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> User:
        """Soft-deactivate a user."""
        user = await self.get_user(user_id)
        user.is_active = False

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.USER_DEACTIVATED,
            entity_type="user",
            entity_id=user.id,
            description=f"User {user.email} deactivated",
            ip_address=ip_address,
        )

        return user

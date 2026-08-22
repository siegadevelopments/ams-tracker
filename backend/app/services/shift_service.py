"""
Shift service — shift type management and schedule CRUD.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AuditAction, ScheduleType, ShiftScheduleStatus
from app.core.exceptions import ConflictError, NotFoundError
from app.core.timezone import is_cross_midnight_shift
from app.models.shift import ShiftSchedule, ShiftType
from app.models.user import User
from app.schemas.shift import (
    ShiftScheduleBulkCreate,
    ShiftScheduleCreate,
    ShiftScheduleUpdate,
    ShiftTypeCreate,
    ShiftTypeUpdate,
)
from app.services.audit_service import AuditService


class ShiftService:
    """Manages shift types and scheduling."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    # ─── Shift Types ───────────────────────────────────────────────────────

    async def create_shift_type(
        self,
        data: ShiftTypeCreate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> ShiftType:
        """Create a reusable shift type definition."""
        existing = await self.db.execute(
            select(ShiftType).where(ShiftType.name == data.name)
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Shift type '{data.name}' already exists")

        # Auto-detect cross-midnight if not explicitly set
        crosses_midnight = data.crosses_midnight or is_cross_midnight_shift(
            data.default_start, data.default_end
        )

        shift_type = ShiftType(
            name=data.name,
            default_start=data.default_start,
            default_end=data.default_end,
            crosses_midnight=crosses_midnight,
            grace_period_minutes=data.grace_period_minutes,
            description=data.description,
        )
        self.db.add(shift_type)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.SHIFT_TYPE_CREATED,
            entity_type="shift_type",
            entity_id=shift_type.id,
            after_value={
                "name": shift_type.name,
                "start": str(shift_type.default_start),
                "end": str(shift_type.default_end),
                "crosses_midnight": crosses_midnight,
            },
            ip_address=ip_address,
        )

        return shift_type

    async def list_shift_types(self, active_only: bool = True) -> list[ShiftType]:
        """List shift types."""
        query = select(ShiftType)
        if active_only:
            query = query.where(ShiftType.is_active == True)  # noqa: E712
        query = query.order_by(ShiftType.name)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_shift_type(self, shift_type_id: uuid.UUID) -> ShiftType:
        """Get a shift type by ID."""
        result = await self.db.execute(
            select(ShiftType).where(ShiftType.id == shift_type_id)
        )
        shift_type = result.scalar_one_or_none()
        if not shift_type:
            raise NotFoundError("Shift type", str(shift_type_id))
        return shift_type

    async def update_shift_type(
        self,
        shift_type_id: uuid.UUID,
        data: ShiftTypeUpdate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> ShiftType:
        """Update a shift type."""
        shift_type = await self.get_shift_type(shift_type_id)

        before = {"name": shift_type.name, "is_active": shift_type.is_active}

        if data.name is not None:
            existing = await self.db.execute(
                select(ShiftType).where(
                    ShiftType.name == data.name, ShiftType.id != shift_type_id
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictError(f"Shift type '{data.name}' already exists")
            shift_type.name = data.name
        if data.default_start is not None:
            shift_type.default_start = data.default_start
        if data.default_end is not None:
            shift_type.default_end = data.default_end
        if data.crosses_midnight is not None:
            shift_type.crosses_midnight = data.crosses_midnight
        if data.grace_period_minutes is not None:
            shift_type.grace_period_minutes = data.grace_period_minutes
        if data.description is not None:
            shift_type.description = data.description
        if data.is_active is not None:
            shift_type.is_active = data.is_active

        after = {"name": shift_type.name, "is_active": shift_type.is_active}

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.SHIFT_TYPE_UPDATED,
            entity_type="shift_type",
            entity_id=shift_type.id,
            before_value=before,
            after_value=after,
            ip_address=ip_address,
        )

        return shift_type

    # ─── Shift Schedules ───────────────────────────────────────────────────

    async def create_schedule(
        self,
        data: ShiftScheduleCreate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> ShiftSchedule:
        """Create a single shift schedule assignment."""
        # Validate user exists
        user_result = await self.db.execute(
            select(User).where(User.id == data.user_id, User.is_active == True)  # noqa: E712
        )
        if not user_result.scalar_one_or_none():
            raise NotFoundError("User", str(data.user_id))

        # Validate shift type
        shift_type = await self.get_shift_type(data.shift_type_id)

        # Check for duplicate schedule
        existing = await self.db.execute(
            select(ShiftSchedule).where(
                ShiftSchedule.user_id == data.user_id,
                ShiftSchedule.shift_date == data.shift_date,
                ShiftSchedule.status != ShiftScheduleStatus.CANCELLED.value,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(
                f"User already has a schedule for {data.shift_date}"
            )

        schedule = ShiftSchedule(
            user_id=data.user_id,
            shift_type_id=data.shift_type_id,
            team_id=data.team_id,
            shift_date=data.shift_date,
            scheduled_start=data.scheduled_start or shift_type.default_start,
            scheduled_end=data.scheduled_end or shift_type.default_end,
            schedule_type=data.schedule_type.value,
            notes=data.notes,
            created_by=actor_id,
        )
        self.db.add(schedule)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.SHIFT_SCHEDULE_CREATED,
            entity_type="shift_schedule",
            entity_id=schedule.id,
            after_value={
                "user_id": str(data.user_id),
                "shift_date": str(data.shift_date),
                "shift_type": shift_type.name,
            },
            ip_address=ip_address,
        )

        return schedule

    async def create_bulk_schedules(
        self,
        data: ShiftScheduleBulkCreate,
        actor_id: uuid.UUID,
        actor_email: str | None = None,
        ip_address: str | None = None,
    ) -> list[ShiftSchedule]:
        """Create schedules for multiple employees over a date range."""
        shift_type = await self.get_shift_type(data.shift_type_id)
        schedules = []

        current_date = data.start_date
        while current_date <= data.end_date:
            if current_date not in data.exclude_dates:
                for user_id in data.user_ids:
                    # Skip if already scheduled
                    existing = await self.db.execute(
                        select(ShiftSchedule).where(
                            ShiftSchedule.user_id == user_id,
                            ShiftSchedule.shift_date == current_date,
                            ShiftSchedule.status != ShiftScheduleStatus.CANCELLED.value,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                    schedule = ShiftSchedule(
                        user_id=user_id,
                        shift_type_id=data.shift_type_id,
                        team_id=data.team_id,
                        shift_date=current_date,
                        scheduled_start=shift_type.default_start,
                        scheduled_end=shift_type.default_end,
                        schedule_type=data.schedule_type.value,
                        notes=data.notes,
                        created_by=actor_id,
                    )
                    self.db.add(schedule)
                    schedules.append(schedule)

            current_date += timedelta(days=1)

        await self.db.flush()

        # Single audit entry for bulk
        await self.audit.log(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.SHIFT_SCHEDULE_CREATED,
            entity_type="shift_schedule",
            description=f"Bulk created {len(schedules)} schedules from {data.start_date} to {data.end_date}",
            after_value={
                "count": len(schedules),
                "user_count": len(data.user_ids),
                "start_date": str(data.start_date),
                "end_date": str(data.end_date),
                "shift_type": shift_type.name,
            },
            ip_address=ip_address,
        )

        return schedules

    async def list_schedules(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        user_id: uuid.UUID | None = None,
        team_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[ShiftSchedule], int]:
        """List schedules with filters."""
        query = select(ShiftSchedule).options(
            selectinload(ShiftSchedule.user),
            selectinload(ShiftSchedule.shift_type),
            selectinload(ShiftSchedule.team),
        )
        count_query = select(func.count(ShiftSchedule.id))

        if start_date:
            query = query.where(ShiftSchedule.shift_date >= start_date)
            count_query = count_query.where(ShiftSchedule.shift_date >= start_date)
        if end_date:
            query = query.where(ShiftSchedule.shift_date <= end_date)
            count_query = count_query.where(ShiftSchedule.shift_date <= end_date)
        if user_id:
            query = query.where(ShiftSchedule.user_id == user_id)
            count_query = count_query.where(ShiftSchedule.user_id == user_id)
        if team_id:
            query = query.where(ShiftSchedule.team_id == team_id)
            count_query = count_query.where(ShiftSchedule.team_id == team_id)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        query = query.order_by(ShiftSchedule.shift_date, ShiftSchedule.scheduled_start)
        query = query.offset(offset).limit(page_size)
        result = await self.db.execute(query)
        schedules = list(result.scalars().all())

        return schedules, total

    async def get_user_schedule_for_date(
        self, user_id: uuid.UUID, target_date: date
    ) -> ShiftSchedule | None:
        """Get a user's active schedule for a specific date."""
        result = await self.db.execute(
            select(ShiftSchedule)
            .options(
                selectinload(ShiftSchedule.shift_type),
                selectinload(ShiftSchedule.user),
            )
            .where(
                ShiftSchedule.user_id == user_id,
                ShiftSchedule.shift_date == target_date,
                ShiftSchedule.status != ShiftScheduleStatus.CANCELLED.value,
            )
        )
        return result.scalar_one_or_none()

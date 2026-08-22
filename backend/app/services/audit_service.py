"""
Audit service — immutable audit log creation and querying.
Every important action must be auditable.
"""

import uuid
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AuditAction
from app.models.audit import AuditLog


class AuditService:
    """Creates and queries immutable audit records."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        *,
        actor_id: uuid.UUID | None,
        actor_email: str | None = None,
        action: AuditAction | str,
        entity_type: str,
        entity_id: uuid.UUID | None = None,
        before_value: dict | None = None,
        after_value: dict | None = None,
        description: str | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """Create an immutable audit log entry."""
        entry = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            action=action.value if isinstance(action, AuditAction) else action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_value=before_value,
            after_value=after_value,
            description=description,
            ip_address=ip_address,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def get_logs(
        self,
        *,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        actor_id: uuid.UUID | None = None,
        action: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditLog], int]:
        """Query audit logs with filtering and pagination."""
        query = select(AuditLog)
        count_query = select(func.count(AuditLog.id))

        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
            count_query = count_query.where(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.where(AuditLog.entity_id == entity_id)
            count_query = count_query.where(AuditLog.entity_id == entity_id)
        if actor_id:
            query = query.where(AuditLog.actor_id == actor_id)
            count_query = count_query.where(AuditLog.actor_id == actor_id)
        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
            count_query = count_query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
            count_query = count_query.where(AuditLog.created_at <= end_date)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        offset = (page - 1) * page_size
        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        logs = list(result.scalars().all())

        return logs, total

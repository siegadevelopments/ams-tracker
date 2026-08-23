"""
Database auto-initializer service.
Ensures tables exist and default seed data (SUPER_ADMIN role, admin@lotuss.com user) is present.
"""

import logging
import uuid
from datetime import time
from sqlalchemy import select
from app.database import engine, Base, async_session_factory
import app.models  # noqa: F401
from app.models.user import User, Role
from app.models.shift import ShiftType
from app.core.security import hash_password

logger = logging.getLogger("ams.init_db")


async def init_db() -> None:
    """Initialize database tables and seed default admin user if missing."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with async_session_factory() as session:
            # 1. Seed Roles if missing
            roles_def = [
                ("SUPER_ADMIN", "Full system access and admin management"),
                ("AMS_MANAGER", "Operations management and SLA reporting"),
                ("TEAM_LEAD", "Team shift scheduling and agent oversight"),
                ("AGENT", "Shift tracking and ticket activity logging"),
                ("VIEWER", "Read-only access to dashboard and reports"),
            ]
            
            roles_map = {}
            for name, desc in roles_def:
                stmt = select(Role).where(Role.name == name)
                result = await session.execute(stmt)
                role = result.scalar_one_or_none()
                if not role:
                    role = Role(id=uuid.uuid4(), name=name, description=desc)
                    session.add(role)
                    await session.flush()
                roles_map[name] = role

            # 2. Seed Default Admin Users if missing
            admin_emails = [
                ("admin@gmail.com", "Gmail Admin", "ADMIN-000"),
                ("siegadevelopments@gmail.com", "Siega Admin", "ADMIN-002"),
                ("admin@lotuss.com", "System Administrator", "ADMIN-001"),
            ]
            
            for email_addr, name_str, emp_id in admin_emails:
                stmt = select(User).where(User.email == email_addr)
                result = await session.execute(stmt)
                admin = result.scalar_one_or_none()
                
                if not admin:
                    first_n, last_n = name_str.split(" ", 1)
                    admin = User(
                        id=uuid.uuid4(),
                        email=email_addr,
                        password_hash=hash_password("Admin@123!"),
                        first_name=first_n,
                        last_name=last_n,
                        employee_id=emp_id,
                        role_id=roles_map["SUPER_ADMIN"].id,
                        timezone="Asia/Manila",
                        is_active=True,
                    )
                    session.add(admin)
                    logger.info(f"Seeded admin user: {email_addr}")

            # 3. Seed Default Shift Types if missing
            shifts_def = [
                ("Morning Shift", time(6, 0), time(14, 0), False, 15, "06:00 - 14:00"),
                ("Afternoon Shift", time(14, 0), time(22, 0), False, 15, "14:00 - 22:00"),
                ("Night Shift", time(22, 0), time(6, 0), True, 15, "22:00 - 06:00 (crosses midnight)"),
            ]
            for name, start, end, midnight, grace, desc in shifts_def:
                stmt = select(ShiftType).where(ShiftType.name == name)
                res = await session.execute(stmt)
                if not res.scalar_one_or_none():
                    st = ShiftType(
                        id=uuid.uuid4(),
                        name=name,
                        default_start=start,
                        default_end=end,
                        crosses_midnight=midnight,
                        grace_period_minutes=grace,
                        description=desc,
                        is_active=True,
                    )
                    session.add(st)

            await session.commit()
            logger.info("Database schema and seed data initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization step skipped or failed: {e}")

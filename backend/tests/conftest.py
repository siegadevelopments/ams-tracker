"""
Test fixtures for the AMS backend.
Uses an in-memory SQLite database for fast, isolated tests.
"""

import asyncio
import uuid
from datetime import date, datetime, time, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.database import Base, get_db_session
from app.main import app


# Use SQLite for testing (no PostgreSQL dependency in CI)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for session-scoped fixtures."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Create a test database session."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    """Create a test HTTP client with overridden DB dependency."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_db(db_session):
    """Seed the test database with roles, a test user, and shift types."""
    from app.models.user import Role, User
    from app.models.shift import ShiftType

    # Create roles
    roles = {}
    for role_name in ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD", "AGENT", "VIEWER"]:
        role = Role(id=uuid.uuid4(), name=role_name, description=f"Test {role_name}")
        db_session.add(role)
        roles[role_name] = role

    await db_session.flush()

    # Create admin user
    admin = User(
        id=uuid.uuid4(),
        email="admin@test.local",
        password_hash=hash_password("Admin@123!"),
        first_name="Test",
        last_name="Admin",
        employee_id="TEST-001",
        role_id=roles["SUPER_ADMIN"].id,
        timezone="Asia/Manila",
    )
    db_session.add(admin)

    # Create agent user
    agent = User(
        id=uuid.uuid4(),
        email="agent@test.local",
        password_hash=hash_password("Agent@123!"),
        first_name="Test",
        last_name="Agent",
        employee_id="TEST-002",
        role_id=roles["AGENT"].id,
        timezone="Asia/Manila",
    )
    db_session.add(agent)

    # Create shift types
    morning = ShiftType(
        id=uuid.uuid4(),
        name="Morning Shift",
        default_start=time(6, 0),
        default_end=time(14, 0),
        crosses_midnight=False,
        grace_period_minutes=15,
    )
    night = ShiftType(
        id=uuid.uuid4(),
        name="Night Shift",
        default_start=time(22, 0),
        default_end=time(6, 0),
        crosses_midnight=True,
        grace_period_minutes=15,
    )
    db_session.add(morning)
    db_session.add(night)

    await db_session.commit()

    return {
        "roles": roles,
        "admin": admin,
        "agent": agent,
        "morning_shift": morning,
        "night_shift": night,
    }

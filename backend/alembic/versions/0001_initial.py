"""
Initial schema and seed data.

Creates all Phase 1 tables and seeds:
- Roles (SUPER_ADMIN, AMS_MANAGER, TEAM_LEAD, AGENT, VIEWER)
- Permissions
- Role-permission mappings
- Default admin user (admin@ams.local / Admin@123!)
- Default shift types (Morning, Afternoon, Night)
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Roles ─────────────────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ─── Permissions ───────────────────────────────────────────────────
    op.create_table(
        "permissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(100), unique=True, nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
    )

    # ─── Role Permissions ──────────────────────────────────────────────
    op.create_table(
        "role_permissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("role_id", UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_id", UUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
    )

    # ─── Users ─────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("employee_id", sa.String(50), unique=True, nullable=True, index=True),
        sa.Column("role_id", UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False, default="Asia/Manila"),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Teams ─────────────────────────────────────────────────────────
    op.create_table(
        "teams",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("manager_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Team Members ──────────────────────────────────────────────────
    op.create_table(
        "team_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role_in_team", sa.String(50), nullable=False, default="MEMBER"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
    )

    # ─── Shift Types ──────────────────────────────────────────────────
    op.create_table(
        "shift_types",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("default_start", sa.Time, nullable=False),
        sa.Column("default_end", sa.Time, nullable=False),
        sa.Column("crosses_midnight", sa.Boolean, nullable=False, default=False),
        sa.Column("grace_period_minutes", sa.Integer, nullable=False, default=15),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Shift Schedules ──────────────────────────────────────────────
    op.create_table(
        "shift_schedules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("shift_type_id", UUID(as_uuid=True), sa.ForeignKey("shift_types.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True, index=True),
        sa.Column("shift_date", sa.Date, nullable=False, index=True),
        sa.Column("scheduled_start", sa.Time, nullable=False),
        sa.Column("scheduled_end", sa.Time, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, default="SCHEDULED"),
        sa.Column("schedule_type", sa.String(20), nullable=False, default="MANUAL"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Attendance Records ───────────────────────────────────────────
    op.create_table(
        "attendance_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("shift_schedule_id", UUID(as_uuid=True), sa.ForeignKey("shift_schedules.id"), nullable=True),
        sa.Column("attendance_date", sa.Date, nullable=False, index=True),
        sa.Column("scheduled_start_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_end_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_start_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_end_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("late_minutes", sa.Integer, nullable=False, default=0),
        sa.Column("early_departure_minutes", sa.Integer, nullable=False, default=0),
        sa.Column("overtime_minutes", sa.Integer, nullable=False, default=0),
        sa.Column("total_break_minutes", sa.Integer, nullable=False, default=0),
        sa.Column("status", sa.String(30), nullable=False, default="MISSING_LOG", index=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("correction_requested", sa.Boolean, default=False),
        sa.Column("correction_reason", sa.Text, nullable=True),
        sa.Column("correction_approved", sa.Boolean, nullable=True),
        sa.Column("correction_approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Break Records ────────────────────────────────────────────────
    op.create_table(
        "break_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("attendance_id", UUID(as_uuid=True), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("start_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("break_type", sa.String(20), nullable=False, default="REST"),
    )

    # ─── Audit Logs ───────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("actor_email", sa.String(255), nullable=True),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("entity_type", sa.String(100), nullable=False, index=True),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("before_value", JSONB, nullable=True),
        sa.Column("after_value", JSONB, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )

    # ─── Composite Indexes ────────────────────────────────────────────
    op.create_index("idx_shifts_user_date", "shift_schedules", ["user_id", "shift_date"])
    op.create_index("idx_shifts_team_date", "shift_schedules", ["team_id", "shift_date"])
    op.create_index("idx_attendance_user_date", "attendance_records", ["user_id", "attendance_date"])
    op.create_index("idx_audit_entity", "audit_logs", ["entity_type", "entity_id"])

    # ─── Seed Data ─────────────────────────────────────────────────────
    _seed_roles_and_permissions()
    _seed_admin_user()
    _seed_shift_types()


def _seed_roles_and_permissions():
    """Seed roles, permissions, and role-permission mappings."""
    roles_table = sa.table(
        "roles",
        sa.column("id", UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )
    perms_table = sa.table(
        "permissions",
        sa.column("id", UUID),
        sa.column("code", sa.String),
        sa.column("module", sa.String),
        sa.column("description", sa.String),
    )
    rp_table = sa.table(
        "role_permissions",
        sa.column("id", UUID),
        sa.column("role_id", UUID),
        sa.column("permission_id", UUID),
    )

    # Roles
    roles = {
        "SUPER_ADMIN": uuid.uuid4(),
        "AMS_MANAGER": uuid.uuid4(),
        "TEAM_LEAD": uuid.uuid4(),
        "AGENT": uuid.uuid4(),
        "VIEWER": uuid.uuid4(),
    }
    role_descriptions = {
        "SUPER_ADMIN": "Full system administrator",
        "AMS_MANAGER": "AMS operations manager",
        "TEAM_LEAD": "Shift team lead",
        "AGENT": "AMS support agent",
        "VIEWER": "Read-only access",
    }
    for name, rid in roles.items():
        op.execute(roles_table.insert().values(id=rid, name=name, description=role_descriptions[name]))

    # Permissions
    permissions_data = [
        ("users.create", "users", "Create new users"),
        ("users.read", "users", "View users"),
        ("users.update", "users", "Update user details"),
        ("users.deactivate", "users", "Deactivate users"),
        ("users.change_role", "users", "Change user roles"),
        ("teams.create", "teams", "Create teams"),
        ("teams.read", "teams", "View teams"),
        ("teams.update", "teams", "Update teams"),
        ("teams.manage_members", "teams", "Add/remove team members"),
        ("shifts.create", "shifts", "Create shift schedules"),
        ("shifts.read", "shifts", "View shift schedules"),
        ("shifts.update", "shifts", "Update shift schedules"),
        ("attendance.start", "attendance", "Start own shift"),
        ("attendance.end", "attendance", "End own shift"),
        ("attendance.read_all", "attendance", "View all attendance records"),
        ("attendance.correct", "attendance", "Approve attendance corrections"),
        ("attendance.team_status", "attendance", "View team attendance status"),
        ("audit.read", "audit", "View audit logs"),
        ("settings.manage", "settings", "Manage system settings"),
        ("reports.view", "reports", "View reports"),
        ("reports.export", "reports", "Export reports"),
    ]

    perm_ids = {}
    for code, module, description in permissions_data:
        pid = uuid.uuid4()
        perm_ids[code] = pid
        op.execute(perms_table.insert().values(id=pid, code=code, module=module, description=description))

    # Role-permission mappings
    role_perms = {
        "AMS_MANAGER": [
            "users.read", "teams.create", "teams.read", "teams.update", "teams.manage_members",
            "shifts.create", "shifts.read", "shifts.update",
            "attendance.read_all", "attendance.correct", "attendance.team_status",
            "audit.read", "reports.view", "reports.export",
        ],
        "TEAM_LEAD": [
            "users.read", "teams.read",
            "shifts.create", "shifts.read", "shifts.update",
            "attendance.start", "attendance.end", "attendance.read_all", "attendance.team_status",
            "reports.view",
        ],
        "AGENT": [
            "teams.read", "shifts.read",
            "attendance.start", "attendance.end",
        ],
        "VIEWER": [
            "teams.read", "shifts.read", "attendance.read_all",
            "reports.view",
        ],
    }

    for role_name, perm_codes in role_perms.items():
        for code in perm_codes:
            op.execute(rp_table.insert().values(
                id=uuid.uuid4(),
                role_id=roles[role_name],
                permission_id=perm_ids[code],
            ))


def _seed_admin_user():
    """Create default admin user. Password: Admin@123!"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    users_table = sa.table(
        "users",
        sa.column("id", UUID),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
        sa.column("employee_id", sa.String),
        sa.column("role_id", UUID),
        sa.column("timezone", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    # Get admin role ID
    admin_role = sa.table("roles", sa.column("id", UUID), sa.column("name", sa.String))
    conn = op.get_bind()
    result = conn.execute(sa.select(admin_role.c.id).where(admin_role.c.name == "SUPER_ADMIN"))
    admin_role_id = result.scalar()

    op.execute(users_table.insert().values(
        id=uuid.uuid4(),
        email="admin@ams.local",
        password_hash=pwd_context.hash("Admin@123!"),
        first_name="System",
        last_name="Administrator",
        employee_id="ADMIN-001",
        role_id=admin_role_id,
        timezone="Asia/Manila",
        is_active=True,
    ))


def _seed_shift_types():
    """Create default shift types."""
    shifts_table = sa.table(
        "shift_types",
        sa.column("id", UUID),
        sa.column("name", sa.String),
        sa.column("default_start", sa.Time),
        sa.column("default_end", sa.Time),
        sa.column("crosses_midnight", sa.Boolean),
        sa.column("grace_period_minutes", sa.Integer),
        sa.column("description", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    from datetime import time

    shifts = [
        ("Morning Shift", time(6, 0), time(14, 0), False, 15, "06:00 - 14:00"),
        ("Afternoon Shift", time(14, 0), time(22, 0), False, 15, "14:00 - 22:00"),
        ("Night Shift", time(22, 0), time(6, 0), True, 15, "22:00 - 06:00 (crosses midnight)"),
    ]

    for name, start, end, midnight, grace, desc in shifts:
        op.execute(shifts_table.insert().values(
            id=uuid.uuid4(),
            name=name,
            default_start=start,
            default_end=end,
            crosses_midnight=midnight,
            grace_period_minutes=grace,
            description=desc,
            is_active=True,
        ))


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("break_records")
    op.drop_table("attendance_records")
    op.drop_table("shift_schedules")
    op.drop_table("shift_types")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")

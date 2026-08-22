"""Create tickets and shift_activities tables.

Revision ID: 0002_tickets_and_activities
Revises: 0001_initial
Create Date: 2026-08-23
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# Revision identifiers
revision = "0002_tickets_and_activities"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── Tickets ───────────────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_number", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("ticket_type", sa.String(50), nullable=False, default="INCIDENT", index=True),
        sa.Column("priority", sa.String(10), nullable=False, default="P3", index=True),
        sa.Column("status", sa.String(30), nullable=False, default="OPEN", index=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("environment", sa.String(50), nullable=True, default="PROD"),
        sa.Column("assignee_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("attendance_id", UUID(as_uuid=True), sa.ForeignKey("attendance_records.id"), nullable=True, index=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ─── Shift Activities ─────────────────────────────────────────────
    op.create_table(
        "shift_activities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("attendance_id", UUID(as_uuid=True), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ticket_id", UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("activity_type", sa.String(50), nullable=False, default="INCIDENT", index=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, default="COMPLETED"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("shift_activities")
    op.drop_table("tickets")

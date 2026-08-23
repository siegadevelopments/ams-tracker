"""
Reporting & CSV Data Export Service.
Generates aggregated operational metrics and CSV reports for stakeholders.
"""

import csv
import io
import uuid
from datetime import date, datetime, time, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance import AttendanceRecord
from app.models.ticket import ShiftActivity, Ticket
from app.models.user import User


class ReportService:
    """Domain service for generating stakeholder reports and CSV exports."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_attendance_summary(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        user_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Aggregate attendance metrics over a date range."""
        query = select(AttendanceRecord).options(selectinload(AttendanceRecord.user))

        if start_date:
            dt_start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
            query = query.where(AttendanceRecord.actual_start_utc >= dt_start)
        if end_date:
            dt_end = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
            query = query.where(AttendanceRecord.actual_start_utc <= dt_end)
        if user_id:
            query = query.where(AttendanceRecord.user_id == user_id)

        result = await self.db.execute(query.order_by(AttendanceRecord.actual_start_utc.desc()))
        records = result.scalars().all()

        total_shifts = len(records)
        total_late = sum(1 for r in records if r.status == "LATE" or (r.late_minutes or 0) > 0)
        total_overtime_min = sum(r.overtime_minutes or 0 for r in records)
        total_late_min = sum(r.late_minutes or 0 for r in records)

        return {
            "total_shifts": total_shifts,
            "total_late_shifts": total_late,
            "total_late_minutes": total_late_min,
            "total_overtime_minutes": total_overtime_min,
            "records": records,
        }

    async def generate_attendance_csv(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        user_id: uuid.UUID | None = None,
    ) -> str:
        """Generate formatted CSV string of attendance records."""
        summary = await self.get_attendance_summary(start_date, end_date, user_id)
        records: list[AttendanceRecord] = summary["records"]

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
          "Attendance ID",
          "Employee ID",
          "Employee Name",
          "Email",
          "Shift Date",
          "Clock In (UTC)",
          "Clock Out (UTC)",
          "Status",
          "Late (Minutes)",
          "Overtime (Minutes)",
          "Break (Minutes)",
          "Notes"
        ])

        for r in records:
            user_name = f"{r.user.first_name} {r.user.last_name}" if r.user else "Unknown"
            emp_id = r.user.employee_id if r.user else ""
            email = r.user.email if r.user else ""
            shift_date = r.actual_start_utc.strftime("%Y-%m-%d") if r.actual_start_utc else ""
            clock_in = r.actual_start_utc.isoformat() if r.actual_start_utc else ""
            clock_out = r.actual_end_utc.isoformat() if r.actual_end_utc else ""

            writer.writerow([
                str(r.id),
                emp_id,
                user_name,
                email,
                shift_date,
                clock_in,
                clock_out,
                r.status,
                r.late_minutes or 0,
                r.overtime_minutes or 0,
                r.total_break_minutes or 0,
                r.notes or "",
            ])

        return output.getvalue()

    async def get_ticket_summary(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | None = None,
        priority: str | None = None,
    ) -> dict[str, Any]:
        """Aggregate ticket metrics over a date range."""
        query = select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.created_by),
        )

        if start_date:
            dt_start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
            query = query.where(Ticket.created_at >= dt_start)
        if end_date:
            dt_end = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
            query = query.where(Ticket.created_at <= dt_end)
        if status:
            query = query.where(Ticket.status == status)
        if priority:
            query = query.where(Ticket.priority == priority)

        result = await self.db.execute(query.order_by(Ticket.created_at.desc()))
        tickets = result.scalars().all()

        total = len(tickets)
        resolved = sum(1 for t in tickets if t.status in ("RESOLVED", "CLOSED"))
        by_priority = {
            "P1": sum(1 for t in tickets if t.priority == "P1"),
            "P2": sum(1 for t in tickets if t.priority == "P2"),
            "P3": sum(1 for t in tickets if t.priority == "P3"),
            "P4": sum(1 for t in tickets if t.priority == "P4"),
        }

        return {
            "total_tickets": total,
            "resolved_tickets": resolved,
            "by_priority": by_priority,
            "tickets": tickets,
        }

    async def generate_ticket_csv(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | None = None,
        priority: str | None = None,
    ) -> str:
        """Generate formatted CSV string of tickets."""
        summary = await self.get_ticket_summary(start_date, end_date, status, priority)
        tickets: list[Ticket] = summary["tickets"]

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
          "Ticket Number",
          "Title",
          "Type",
          "Priority",
          "Status",
          "Category",
          "Environment",
          "Assignee Name",
          "Created By",
          "Created At (UTC)",
          "Resolved At (UTC)",
          "Description"
        ])

        for t in tickets:
            assignee = f"{t.assignee.first_name} {t.assignee.last_name}" if t.assignee else "Unassigned"
            creator = f"{t.created_by.first_name} {t.created_by.last_name}" if t.created_by else ""
            created_at = t.created_at.isoformat() if t.created_at else ""
            resolved_at = t.resolved_at.isoformat() if t.resolved_at else ""

            writer.writerow([
                t.ticket_number,
                t.title,
                t.ticket_type,
                t.priority,
                t.status,
                t.category or "",
                t.environment or "",
                assignee,
                creator,
                created_at,
                resolved_at,
                t.description or "",
            ])

        return output.getvalue()

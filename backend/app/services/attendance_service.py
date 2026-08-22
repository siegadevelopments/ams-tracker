"""
Attendance service — the core shift start/end workflow.
Handles:
  - Start shift (1-click, auto-detects schedule, calculates lateness)
  - End shift (calculates overtime/early departure)
  - Break management
  - Team status (live view for managers)
  - Attendance corrections

Cross-midnight shifts are treated as a single attendance record anchored
to the shift_date, not split across calendar days.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AttendanceStatus, AuditAction, BreakType
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.core.timezone import (
    calculate_early_departure_minutes,
    calculate_late_minutes,
    calculate_overtime_minutes,
    combine_date_time_to_utc,
    to_display_tz,
    utc_now,
)
from app.models.attendance import AttendanceRecord, BreakRecord
from app.models.shift import ShiftSchedule
from app.models.user import User
from app.services.audit_service import AuditService


class AttendanceService:
    """Manages employee attendance lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def start_shift(
        self,
        user: User,
        notes: str | None = None,
        ip_address: str | None = None,
    ) -> AttendanceRecord:
        """
        Employee starts their shift.
        Auto-detects today's schedule and calculates lateness.
        """
        now = utc_now()
        today_display = to_display_tz(now).date()

        # Check if already started a shift today
        existing = await self._get_active_attendance(user.id)
        if existing:
            raise BusinessRuleError(
                "You already have an active shift. End your current shift before starting a new one."
            )

        # Find today's schedule (check both today and yesterday for cross-midnight)
        schedule = await self._find_schedule_for_now(user.id, today_display)

        # Build attendance record
        attendance = AttendanceRecord(
            user_id=user.id,
            attendance_date=today_display,
            actual_start_utc=now,
            notes=notes,
        )

        if schedule:
            attendance.shift_schedule_id = schedule.id
            # Calculate scheduled times in UTC
            scheduled_start_utc = combine_date_time_to_utc(
                schedule.shift_date,
                schedule.scheduled_start,
                user.timezone,
            )
            # Handle cross-midnight end time
            if schedule.shift_type and schedule.shift_type.crosses_midnight:
                scheduled_end_utc = combine_date_time_to_utc(
                    schedule.shift_date + timedelta(days=1),
                    schedule.scheduled_end,
                    user.timezone,
                )
            else:
                scheduled_end_utc = combine_date_time_to_utc(
                    schedule.shift_date,
                    schedule.scheduled_end,
                    user.timezone,
                )

            attendance.scheduled_start_utc = scheduled_start_utc
            attendance.scheduled_end_utc = scheduled_end_utc

            # Calculate lateness
            grace = schedule.shift_type.grace_period_minutes if schedule.shift_type else 15
            late_mins = calculate_late_minutes(scheduled_start_utc, now, grace)
            attendance.late_minutes = late_mins
            attendance.status = (
                AttendanceStatus.LATE.value if late_mins > 0
                else AttendanceStatus.ON_TIME.value
            )
        else:
            # No schedule found — record as manual attendance
            attendance.status = AttendanceStatus.ON_TIME.value

        self.db.add(attendance)
        await self.db.flush()

        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.SHIFT_STARTED,
            entity_type="attendance",
            entity_id=attendance.id,
            after_value={
                "status": attendance.status,
                "late_minutes": attendance.late_minutes,
                "scheduled_start": str(attendance.scheduled_start_utc) if attendance.scheduled_start_utc else None,
                "actual_start": str(now),
            },
            ip_address=ip_address,
        )

        return attendance

    async def end_shift(
        self,
        user: User,
        notes: str | None = None,
        ip_address: str | None = None,
    ) -> AttendanceRecord:
        """
        Employee ends their shift.
        Calculates overtime and early departure.
        """
        now = utc_now()

        attendance = await self._get_active_attendance(user.id)
        if not attendance:
            raise BusinessRuleError("No active shift found to end")

        attendance.actual_end_utc = now

        # Close any open breaks
        for brk in attendance.breaks:
            if brk.end_utc is None:
                brk.end_utc = now
                brk.duration_minutes = int(
                    (now - brk.start_utc).total_seconds() / 60
                )

        # Recalculate total break minutes
        total_break = sum(
            b.duration_minutes or 0 for b in attendance.breaks
        )
        attendance.total_break_minutes = total_break

        # Calculate overtime / early departure
        if attendance.scheduled_end_utc:
            attendance.overtime_minutes = calculate_overtime_minutes(
                attendance.scheduled_end_utc, now
            )
            attendance.early_departure_minutes = calculate_early_departure_minutes(
                attendance.scheduled_end_utc, now
            )

            # Update status if overtime
            if attendance.overtime_minutes > 0 and attendance.status == AttendanceStatus.ON_TIME.value:
                attendance.status = AttendanceStatus.OVERTIME.value

        if notes:
            attendance.notes = (
                f"{attendance.notes}\n{notes}" if attendance.notes else notes
            )

        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.SHIFT_ENDED,
            entity_type="attendance",
            entity_id=attendance.id,
            after_value={
                "actual_end": str(now),
                "overtime_minutes": attendance.overtime_minutes,
                "early_departure_minutes": attendance.early_departure_minutes,
                "total_break_minutes": total_break,
            },
            ip_address=ip_address,
        )

        return attendance

    async def start_break(
        self,
        user: User,
        break_type: str = "REST",
        ip_address: str | None = None,
    ) -> BreakRecord:
        """Start a break during active shift."""
        attendance = await self._get_active_attendance(user.id)
        if not attendance:
            raise BusinessRuleError("No active shift. Start your shift first.")

        # Check no open break exists
        for brk in attendance.breaks:
            if brk.end_utc is None:
                raise BusinessRuleError("You already have an active break. End it first.")

        now = utc_now()
        break_record = BreakRecord(
            attendance_id=attendance.id,
            start_utc=now,
            break_type=break_type,
        )
        self.db.add(break_record)
        await self.db.flush()

        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.BREAK_STARTED,
            entity_type="break",
            entity_id=break_record.id,
            after_value={"start": str(now), "type": break_type},
            ip_address=ip_address,
        )

        return break_record

    async def end_break(
        self,
        user: User,
        ip_address: str | None = None,
    ) -> BreakRecord:
        """End the current active break."""
        attendance = await self._get_active_attendance(user.id)
        if not attendance:
            raise BusinessRuleError("No active shift found")

        # Find open break
        open_break = None
        for brk in attendance.breaks:
            if brk.end_utc is None:
                open_break = brk
                break

        if not open_break:
            raise BusinessRuleError("No active break to end")

        now = utc_now()
        open_break.end_utc = now
        open_break.duration_minutes = int(
            (now - open_break.start_utc).total_seconds() / 60
        )

        # Update total break minutes on attendance
        total_break = sum(b.duration_minutes or 0 for b in attendance.breaks)
        attendance.total_break_minutes = total_break

        await self.audit.log(
            actor_id=user.id,
            actor_email=user.email,
            action=AuditAction.BREAK_ENDED,
            entity_type="break",
            entity_id=open_break.id,
            after_value={
                "end": str(now),
                "duration_minutes": open_break.duration_minutes,
            },
            ip_address=ip_address,
        )

        return open_break

    async def get_current_attendance(self, user_id: uuid.UUID) -> AttendanceRecord | None:
        """Get the user's current active attendance record."""
        return await self._get_active_attendance(user_id)

    async def get_attendance_record(self, attendance_id: uuid.UUID) -> AttendanceRecord:
        """Get a specific attendance record."""
        result = await self.db.execute(
            select(AttendanceRecord)
            .options(
                selectinload(AttendanceRecord.user),
                selectinload(AttendanceRecord.breaks),
                selectinload(AttendanceRecord.shift_schedule).selectinload(ShiftSchedule.shift_type),
            )
            .where(AttendanceRecord.id == attendance_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            raise NotFoundError("Attendance record", str(attendance_id))
        return record

    async def list_attendance(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        user_id: uuid.UUID | None = None,
        team_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AttendanceRecord], int]:
        """List attendance records with filtering and pagination."""
        from app.models.team import TeamMember

        query = select(AttendanceRecord).options(
            selectinload(AttendanceRecord.user),
            selectinload(AttendanceRecord.shift_schedule).selectinload(ShiftSchedule.shift_type),
        )
        count_query = select(func.count(AttendanceRecord.id))

        if start_date:
            query = query.where(AttendanceRecord.attendance_date >= start_date)
            count_query = count_query.where(AttendanceRecord.attendance_date >= start_date)
        if end_date:
            query = query.where(AttendanceRecord.attendance_date <= end_date)
            count_query = count_query.where(AttendanceRecord.attendance_date <= end_date)
        if user_id:
            query = query.where(AttendanceRecord.user_id == user_id)
            count_query = count_query.where(AttendanceRecord.user_id == user_id)
        if team_id:
            team_user_ids = select(TeamMember.user_id).where(
                TeamMember.team_id == team_id, TeamMember.is_active == True  # noqa: E712
            )
            query = query.where(AttendanceRecord.user_id.in_(team_user_ids))
            count_query = count_query.where(AttendanceRecord.user_id.in_(team_user_ids))
        if status:
            query = query.where(AttendanceRecord.status == status)
            count_query = count_query.where(AttendanceRecord.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        query = (
            query.order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.actual_start_utc.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        records = list(result.scalars().all())

        return records, total

    async def get_team_status(self, team_id: uuid.UUID | None = None) -> dict:
        """
        Get live team attendance status.
        Returns who is working, late, not started, absent, on break.
        """
        from app.models.team import TeamMember

        now = utc_now()
        today = to_display_tz(now).date()

        # Get scheduled employees for today
        schedule_query = select(ShiftSchedule).options(
            selectinload(ShiftSchedule.user),
            selectinload(ShiftSchedule.shift_type),
        ).where(
            ShiftSchedule.shift_date == today,
            ShiftSchedule.status != "CANCELLED",
        )

        if team_id:
            schedule_query = schedule_query.where(ShiftSchedule.team_id == team_id)

        schedule_result = await self.db.execute(schedule_query)
        schedules = list(schedule_result.scalars().all())

        # Get today's attendance records
        attendance_query = select(AttendanceRecord).options(
            selectinload(AttendanceRecord.user),
            selectinload(AttendanceRecord.breaks),
        ).where(AttendanceRecord.attendance_date == today)

        if team_id:
            team_user_ids = select(TeamMember.user_id).where(
                TeamMember.team_id == team_id, TeamMember.is_active == True  # noqa: E712
            )
            attendance_query = attendance_query.where(
                AttendanceRecord.user_id.in_(team_user_ids)
            )

        attendance_result = await self.db.execute(attendance_query)
        attendance_records = list(attendance_result.scalars().all())

        # Build lookup
        attendance_by_user = {r.user_id: r for r in attendance_records}

        employees = []
        active = 0
        late = 0
        not_started = 0
        on_break = 0
        absent_count = 0

        for schedule in schedules:
            att = attendance_by_user.get(schedule.user_id)
            user = schedule.user

            entry = {
                "user_id": str(user.id),
                "user_name": user.full_name,
                "employee_id": user.employee_id,
                "shift_type": schedule.shift_type.name if schedule.shift_type else None,
                "scheduled_start": str(schedule.scheduled_start),
                "actual_start": None,
                "status": "NOT_STARTED",
                "late_minutes": 0,
                "current_activity": None,
            }

            if att:
                entry["actual_start"] = str(att.actual_start_utc) if att.actual_start_utc else None
                entry["late_minutes"] = att.late_minutes

                if att.actual_end_utc:
                    entry["status"] = "OFF_DUTY"
                elif any(b.end_utc is None for b in att.breaks):
                    entry["status"] = "ON_BREAK"
                    on_break += 1
                elif att.late_minutes > 0:
                    entry["status"] = "LATE"
                    late += 1
                    active += 1
                else:
                    entry["status"] = "WORKING"
                    active += 1
            else:
                # Check if shift should have started
                scheduled_start_utc = combine_date_time_to_utc(
                    schedule.shift_date,
                    schedule.scheduled_start,
                    user.timezone,
                )
                grace = schedule.shift_type.grace_period_minutes if schedule.shift_type else 15
                threshold = scheduled_start_utc + timedelta(minutes=grace + 30)

                if now > threshold:
                    entry["status"] = "ABSENT"
                    absent_count += 1
                else:
                    not_started += 1

            employees.append(entry)

        return {
            "total_scheduled": len(schedules),
            "active": active,
            "late": late,
            "not_started": not_started,
            "absent": absent_count,
            "on_break": on_break,
            "employees": employees,
        }

    # ─── Private helpers ──────────────────────────────────────────────────

    async def _get_active_attendance(
        self, user_id: uuid.UUID
    ) -> AttendanceRecord | None:
        """Find the current open attendance record (started but not ended)."""
        result = await self.db.execute(
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.breaks))
            .where(
                AttendanceRecord.user_id == user_id,
                AttendanceRecord.actual_start_utc.isnot(None),
                AttendanceRecord.actual_end_utc.is_(None),
            )
            .order_by(AttendanceRecord.actual_start_utc.desc())
        )
        return result.scalar_one_or_none()

    async def _find_schedule_for_now(
        self, user_id: uuid.UUID, today: date
    ) -> ShiftSchedule | None:
        """
        Find the relevant schedule for the current time.
        Checks today first, then yesterday (for late starts on cross-midnight shifts).
        """
        # Check today
        schedule = await self._get_schedule(user_id, today)
        if schedule:
            return schedule

        # Check yesterday (cross-midnight shift might have started yesterday)
        yesterday = today - timedelta(days=1)
        schedule = await self._get_schedule(user_id, yesterday)
        if schedule and schedule.shift_type and schedule.shift_type.crosses_midnight:
            return schedule

        return None

    async def _get_schedule(
        self, user_id: uuid.UUID, target_date: date
    ) -> ShiftSchedule | None:
        """Get a user's non-cancelled schedule for a date."""
        result = await self.db.execute(
            select(ShiftSchedule)
            .options(
                selectinload(ShiftSchedule.shift_type),
                selectinload(ShiftSchedule.user),
            )
            .where(
                ShiftSchedule.user_id == user_id,
                ShiftSchedule.shift_date == target_date,
                ShiftSchedule.status != "CANCELLED",
            )
        )
        return result.scalar_one_or_none()

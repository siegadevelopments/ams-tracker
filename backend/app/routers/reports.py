"""
Reports & Data Export API endpoints.
Restricted to SUPER_ADMIN, AMS_MANAGER, and TEAM_LEAD.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_roles
from app.database import get_db_session
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

MANAGEMENT_ROLES = ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"]


@router.get("/attendance")
async def get_attendance_report(
    current_user: Annotated[User, Depends(require_roles("SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"))],
    start_date: date | None = None,
    end_date: date | None = None,
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Get attendance report summary JSON."""
    service = ReportService(db)
    summary = await service.get_attendance_summary(start_date, end_date, user_id)
    return {
        "data": {
            "total_shifts": summary["total_shifts"],
            "total_late_shifts": summary["total_late_shifts"],
            "total_late_minutes": summary["total_late_minutes"],
            "total_overtime_minutes": summary["total_overtime_minutes"],
        }
    }


@router.get("/attendance/export")
async def export_attendance_csv(
    current_user: Annotated[User, Depends(require_roles("SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"))],
    start_date: date | None = None,
    end_date: date | None = None,
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Download attendance report CSV."""
    service = ReportService(db)
    csv_data = await service.generate_attendance_csv(start_date, end_date, user_id)

    filename = f"attendance_report_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/tickets")
async def get_tickets_report(
    current_user: Annotated[User, Depends(require_roles("SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"))],
    start_date: date | None = None,
    end_date: date | None = None,
    status: str | None = None,
    priority: str | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Get tickets workload report summary JSON."""
    service = ReportService(db)
    summary = await service.get_ticket_summary(start_date, end_date, status, priority)
    return {
        "data": {
            "total_tickets": summary["total_tickets"],
            "resolved_tickets": summary["resolved_tickets"],
            "by_priority": summary["by_priority"],
        }
    }


@router.get("/tickets/export")
async def export_tickets_csv(
    current_user: Annotated[User, Depends(require_roles("SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"))],
    start_date: date | None = None,
    end_date: date | None = None,
    status: str | None = None,
    priority: str | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Download tickets report CSV."""
    service = ReportService(db)
    csv_data = await service.generate_ticket_csv(start_date, end_date, status, priority)

    filename = f"tickets_report_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

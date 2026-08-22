"""
All enumerations used across the AMS system.
Stored as strings in the database for readability and query-friendliness.
"""

from enum import Enum


# ─── User & Access ─────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    """System roles. Permissions are linked to roles in the database."""
    SUPER_ADMIN = "SUPER_ADMIN"
    AMS_MANAGER = "AMS_MANAGER"
    TEAM_LEAD = "TEAM_LEAD"
    AGENT = "AGENT"
    VIEWER = "VIEWER"


# ─── Attendance ────────────────────────────────────────────────────────────────

class AttendanceStatus(str, Enum):
    """Computed status of an attendance record."""
    ON_TIME = "ON_TIME"
    LATE = "LATE"
    ABSENT = "ABSENT"
    LEAVE = "LEAVE"
    REST_DAY = "REST_DAY"
    OVERTIME = "OVERTIME"
    MISSING_LOG = "MISSING_LOG"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"


class BreakType(str, Enum):
    """Type of break."""
    MEAL = "MEAL"
    REST = "REST"
    OTHER = "OTHER"


# ─── Shift ─────────────────────────────────────────────────────────────────────

class ShiftScheduleStatus(str, Enum):
    """Status of a shift schedule assignment."""
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    SWAPPED = "SWAPPED"


class ScheduleType(str, Enum):
    """How the schedule was created."""
    MANUAL = "MANUAL"
    RECURRING = "RECURRING"
    ON_CALL = "ON_CALL"


# ─── Activities ────────────────────────────────────────────────────────────────

class ActivityType(str, Enum):
    """Type of work activity logged during a shift."""
    INCIDENT = "INCIDENT"
    REQUEST = "REQUEST"
    PROBLEM = "PROBLEM"
    CHANGE = "CHANGE"
    MONITORING = "MONITORING"
    DEPLOYMENT = "DEPLOYMENT"
    INVESTIGATION = "INVESTIGATION"
    MEETING = "MEETING"
    DOCUMENTATION = "DOCUMENTATION"
    OTHER = "OTHER"


class ActivityStatus(str, Enum):
    """Status of a logged activity."""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ESCALATED = "ESCALATED"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"


# ─── Tickets ───────────────────────────────────────────────────────────────────

class TicketPriority(str, Enum):
    """Ticket priority levels."""
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class TicketType(str, Enum):
    """Ticket classification."""
    INCIDENT = "INCIDENT"
    REQUEST = "REQUEST"
    PROBLEM = "PROBLEM"
    CHANGE = "CHANGE"


class TicketStatus(str, Enum):
    """Ticket lifecycle status."""
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


# ─── SLA ───────────────────────────────────────────────────────────────────────

class SLAStatus(str, Enum):
    """SLA tracking states."""
    NOT_STARTED = "NOT_STARTED"
    RUNNING = "RUNNING"
    AT_RISK = "AT_RISK"
    BREACHED = "BREACHED"
    MET = "MET"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class SLAType(str, Enum):
    """Type of SLA target."""
    RESPONSE = "RESPONSE"
    RESOLUTION = "RESOLUTION"


# ─── Handover ──────────────────────────────────────────────────────────────────

class HandoverStatus(str, Enum):
    """Status of a shift handover."""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    REVIEWED = "REVIEWED"
    LATE = "LATE"
    MISSING = "MISSING"


class HandoverItemType(str, Enum):
    """Category of handover item."""
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"
    CRITICAL = "CRITICAL"
    ESCALATION = "ESCALATION"
    NEXT_SHIFT_ACTION = "NEXT_SHIFT_ACTION"
    GENERAL_NOTE = "GENERAL_NOTE"


# ─── Monitoring ────────────────────────────────────────────────────────────────

class MonitoringResultStatus(str, Enum):
    """Result of a monitoring check."""
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    FAILED = "FAILED"
    NOT_CHECKED = "NOT_CHECKED"


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationType(str, Enum):
    """Types of system notifications."""
    SHIFT_REMINDER = "SHIFT_REMINDER"
    LATE_ATTENDANCE = "LATE_ATTENDANCE"
    MISSING_REPORT = "MISSING_REPORT"
    SLA_WARNING = "SLA_WARNING"
    SLA_BREACH = "SLA_BREACH"
    HANDOVER_REMINDER = "HANDOVER_REMINDER"
    HANDOVER_LATE = "HANDOVER_LATE"
    MONITORING_MISSED = "MONITORING_MISSED"
    ESCALATION = "ESCALATION"


class NotificationChannel(str, Enum):
    """Delivery channel for notifications."""
    IN_APP = "IN_APP"
    SLACK = "SLACK"
    EMAIL = "EMAIL"


# ─── Audit ─────────────────────────────────────────────────────────────────────

class AuditAction(str, Enum):
    """Auditable actions."""
    # Auth
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Users
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"

    # Teams
    TEAM_CREATED = "TEAM_CREATED"
    TEAM_UPDATED = "TEAM_UPDATED"
    TEAM_MEMBER_ADDED = "TEAM_MEMBER_ADDED"
    TEAM_MEMBER_REMOVED = "TEAM_MEMBER_REMOVED"

    # Shifts
    SHIFT_TYPE_CREATED = "SHIFT_TYPE_CREATED"
    SHIFT_TYPE_UPDATED = "SHIFT_TYPE_UPDATED"
    SHIFT_SCHEDULE_CREATED = "SHIFT_SCHEDULE_CREATED"
    SHIFT_SCHEDULE_UPDATED = "SHIFT_SCHEDULE_UPDATED"

    # Attendance
    SHIFT_STARTED = "SHIFT_STARTED"
    SHIFT_ENDED = "SHIFT_ENDED"
    BREAK_STARTED = "BREAK_STARTED"
    BREAK_ENDED = "BREAK_ENDED"
    ATTENDANCE_CORRECTION_REQUESTED = "ATTENDANCE_CORRECTION_REQUESTED"
    ATTENDANCE_CORRECTION_APPROVED = "ATTENDANCE_CORRECTION_APPROVED"

    # Activities
    ACTIVITY_CREATED = "ACTIVITY_CREATED"
    ACTIVITY_UPDATED = "ACTIVITY_UPDATED"

    # Tickets
    TICKET_CREATED = "TICKET_CREATED"
    TICKET_UPDATED = "TICKET_UPDATED"

    # Handover
    HANDOVER_CREATED = "HANDOVER_CREATED"
    HANDOVER_SUBMITTED = "HANDOVER_SUBMITTED"
    HANDOVER_REVIEWED = "HANDOVER_REVIEWED"

    # SLA
    SLA_RULE_CREATED = "SLA_RULE_CREATED"
    SLA_RULE_UPDATED = "SLA_RULE_UPDATED"

    # Monitoring
    MONITORING_RECORDED = "MONITORING_RECORDED"

    # Integration
    INTEGRATION_CONFIGURED = "INTEGRATION_CONFIGURED"

    # Reports
    REPORT_GENERATED = "REPORT_GENERATED"

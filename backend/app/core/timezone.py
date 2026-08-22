"""
Timezone utilities.
All internal timestamps are UTC. Display conversion uses configured timezone.
"""

from datetime import date, datetime, time, timezone, timedelta

from zoneinfo import ZoneInfo

from app.config import get_settings

settings = get_settings()


def utc_now() -> datetime:
    """Current time in UTC (timezone-aware)."""
    return datetime.now(timezone.utc)


def get_display_timezone() -> ZoneInfo:
    """Get the configured display timezone."""
    return ZoneInfo(settings.DEFAULT_TIMEZONE)


def to_display_tz(dt: datetime) -> datetime:
    """Convert a UTC datetime to the configured display timezone."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(get_display_timezone())


def to_utc(dt: datetime) -> datetime:
    """Convert a timezone-aware datetime to UTC."""
    if dt.tzinfo is None:
        # Assume display timezone if naive
        dt = dt.replace(tzinfo=get_display_timezone())
    return dt.astimezone(timezone.utc)


def combine_date_time_to_utc(
    d: date,
    t: time,
    tz_name: str | None = None,
) -> datetime:
    """
    Combine a date and time in a given timezone and return UTC datetime.
    Used for converting shift schedule times to UTC.
    """
    tz = ZoneInfo(tz_name) if tz_name else get_display_timezone()
    local_dt = datetime.combine(d, t, tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def calculate_late_minutes(
    scheduled_start_utc: datetime,
    actual_start_utc: datetime,
    grace_period_minutes: int = 0,
) -> int:
    """
    Calculate minutes late, accounting for grace period.
    Returns 0 if on time or early.
    """
    if actual_start_utc <= scheduled_start_utc:
        return 0

    diff = actual_start_utc - scheduled_start_utc
    late_minutes = int(diff.total_seconds() / 60)

    if late_minutes <= grace_period_minutes:
        return 0

    return late_minutes


def calculate_overtime_minutes(
    scheduled_end_utc: datetime,
    actual_end_utc: datetime,
) -> int:
    """
    Calculate overtime minutes.
    Returns 0 if ended on time or early.
    """
    if actual_end_utc <= scheduled_end_utc:
        return 0

    diff = actual_end_utc - scheduled_end_utc
    return int(diff.total_seconds() / 60)


def calculate_early_departure_minutes(
    scheduled_end_utc: datetime,
    actual_end_utc: datetime,
) -> int:
    """
    Calculate early departure minutes.
    Returns 0 if stayed until scheduled end or later.
    """
    if actual_end_utc >= scheduled_end_utc:
        return 0

    diff = scheduled_end_utc - actual_end_utc
    return int(diff.total_seconds() / 60)


def is_cross_midnight_shift(start_time: time, end_time: time) -> bool:
    """
    Determine if a shift crosses midnight.
    E.g., start=22:00, end=06:00 → True
    """
    return end_time < start_time

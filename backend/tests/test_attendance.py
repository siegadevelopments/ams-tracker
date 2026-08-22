"""
Tests for timezone utilities and attendance calculations.
These are the most critical business logic tests.
"""

from datetime import datetime, time, timezone, timedelta

from app.core.timezone import (
    calculate_early_departure_minutes,
    calculate_late_minutes,
    calculate_overtime_minutes,
    is_cross_midnight_shift,
    utc_now,
)


class TestLateMinutesCalculation:
    """Test attendance lateness detection."""

    def test_on_time(self):
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 21, 55, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=0) == 0

    def test_exactly_on_time(self):
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=0) == 0

    def test_late_no_grace(self):
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 22, 10, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=0) == 10

    def test_late_within_grace_period(self):
        """Within grace period should not be counted as late."""
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 22, 10, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=15) == 0

    def test_late_beyond_grace_period(self):
        """Beyond grace period should count from scheduled time, not end of grace."""
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 22, 20, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=15) == 20

    def test_significantly_late(self):
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 23, 30, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=15) == 90

    def test_early_arrival(self):
        scheduled = datetime(2026, 8, 22, 22, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 8, 22, 21, 30, tzinfo=timezone.utc)
        assert calculate_late_minutes(scheduled, actual, grace_period_minutes=0) == 0


class TestOvertimeCalculation:
    """Test overtime calculation."""

    def test_no_overtime(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 5, 50, tzinfo=timezone.utc)
        assert calculate_overtime_minutes(scheduled_end, actual_end) == 0

    def test_overtime(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 7, 30, tzinfo=timezone.utc)
        assert calculate_overtime_minutes(scheduled_end, actual_end) == 90

    def test_exactly_on_time(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        assert calculate_overtime_minutes(scheduled_end, actual_end) == 0


class TestEarlyDeparture:
    """Test early departure calculation."""

    def test_no_early_departure(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        assert calculate_early_departure_minutes(scheduled_end, actual_end) == 0

    def test_early_departure(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 5, 30, tzinfo=timezone.utc)
        assert calculate_early_departure_minutes(scheduled_end, actual_end) == 30

    def test_stayed_overtime(self):
        scheduled_end = datetime(2026, 8, 23, 6, 0, tzinfo=timezone.utc)
        actual_end = datetime(2026, 8, 23, 7, 0, tzinfo=timezone.utc)
        assert calculate_early_departure_minutes(scheduled_end, actual_end) == 0


class TestCrossMidnightShift:
    """Test cross-midnight shift detection."""

    def test_night_shift(self):
        """22:00–06:00 crosses midnight."""
        assert is_cross_midnight_shift(time(22, 0), time(6, 0)) is True

    def test_morning_shift(self):
        """06:00–14:00 does NOT cross midnight."""
        assert is_cross_midnight_shift(time(6, 0), time(14, 0)) is False

    def test_afternoon_shift(self):
        """14:00–22:00 does NOT cross midnight."""
        assert is_cross_midnight_shift(time(14, 0), time(22, 0)) is False

    def test_same_time(self):
        """Same start and end is not cross-midnight."""
        assert is_cross_midnight_shift(time(8, 0), time(8, 0)) is False

    def test_late_night(self):
        """23:00–07:00 crosses midnight."""
        assert is_cross_midnight_shift(time(23, 0), time(7, 0)) is True


class TestUtcNow:
    """Verify utc_now returns timezone-aware UTC datetime."""

    def test_returns_utc(self):
        now = utc_now()
        assert now.tzinfo is not None
        assert now.tzinfo == timezone.utc

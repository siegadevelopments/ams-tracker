"use client";

/**
 * My Shift page — the employee's primary workspace.
 * 1-click start/end shift, break controls, current shift status.
 * "Can I complete my required reporting in less than two minutes?" — YES.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import api, { AttendanceRecord, ShiftSchedule, ApiError } from "@/lib/api";

export default function MyShiftPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [shiftStatus, setShiftStatus] = useState<string>("loading"); // loading, no_shift, active, ended
  const [todaySchedule, setTodaySchedule] = useState<ShiftSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadState = useCallback(async () => {
    try {
      // Get current attendance
      const attResult = await api.getCurrentAttendance();
      if (attResult.data) {
        setAttendance(attResult.data);
        setShiftStatus(attResult.data.actual_end_utc ? "ended" : "active");
      } else {
        setAttendance(null);
        setShiftStatus("no_shift");
      }

      // Get today's schedule
      const today = new Date().toISOString().split("T")[0];
      const schedResult = await api.getMySchedule({ start_date: today, end_date: today });
      if (schedResult.data && schedResult.data.length > 0) {
        setTodaySchedule(schedResult.data[0]);
      }
    } catch {
      setError("Unable to load shift data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleStartShift = async () => {
    setActionLoading(true);
    setError("");
    try {
      const result = await api.startShift();
      setAttendance(result.data);
      setShiftStatus("active");
    } catch (err) {
      setError((err as ApiError).message || "Failed to start shift");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!confirm("Are you sure you want to end your shift?")) return;
    setActionLoading(true);
    setError("");
    try {
      const result = await api.endShift();
      setAttendance(result.data);
      setShiftStatus("ended");
    } catch (err) {
      setError((err as ApiError).message || "Failed to end shift");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      await api.startBreak("REST");
      await loadState();
    } catch (err) {
      setError((err as ApiError).message || "Failed to start break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      await api.endBreak();
      await loadState();
    } catch (err) {
      setError((err as ApiError).message || "Failed to end break");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isOnBreak = attendance && !attendance.actual_end_utc && shiftStatus === "active";
  // We'd need break data from the attendance record to truly know, but for now approximate

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Shift</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shift Control Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Shift Control</h2>

          {/* Today's schedule info */}
          {todaySchedule && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm font-medium text-blue-900">
                {todaySchedule.shift_type_name}
              </p>
              <p className="text-sm text-blue-700">
                {todaySchedule.scheduled_start} — {todaySchedule.scheduled_end}
                {todaySchedule.crosses_midnight && " (overnight)"}
              </p>
            </div>
          )}

          {shiftStatus === "no_shift" && (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">
                {todaySchedule ? "Ready to start your shift" : "No shift scheduled for today"}
              </p>
              <button
                onClick={handleStartShift}
                disabled={actionLoading}
                className="btn btn-success btn-lg"
                style={{ minWidth: "200px" }}
              >
                {actionLoading ? "Starting..." : "▶ Start Shift"}
              </button>
            </div>
          )}

          {shiftStatus === "active" && attendance && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Shift Active</span>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Started at</span>
                  <span className="font-medium">
                    {attendance.actual_start_utc
                      ? new Date(attendance.actual_start_utc).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                {attendance.late_minutes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Late</span>
                    <span className="text-amber-600 font-medium">
                      {attendance.late_minutes} min
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Break time</span>
                  <span>{attendance.total_break_minutes} min</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStartBreak}
                  disabled={actionLoading}
                  className="btn btn-outline flex-1"
                >
                  ☕ Start Break
                </button>
                <button
                  onClick={handleEndBreak}
                  disabled={actionLoading}
                  className="btn btn-outline flex-1"
                >
                  ↩ End Break
                </button>
              </div>

              <button
                onClick={handleEndShift}
                disabled={actionLoading}
                className="btn btn-danger btn-lg w-full mt-4"
              >
                {actionLoading ? "Ending..." : "⏹ End Shift"}
              </button>
            </div>
          )}

          {shiftStatus === "ended" && attendance && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-xl">✓</span>
                <span className="font-medium text-slate-700">Shift Completed</span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium">
                    {attendance.actual_start_utc && attendance.actual_end_utc
                      ? (() => {
                          const ms =
                            new Date(attendance.actual_end_utc).getTime() -
                            new Date(attendance.actual_start_utc).getTime();
                          const hrs = Math.floor(ms / 3600000);
                          const mins = Math.floor((ms % 3600000) / 60000);
                          return `${hrs}h ${mins}m`;
                        })()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`badge ${attendance.status === "ON_TIME" || attendance.status === "OVERTIME" ? "badge-success" : "badge-warning"}`}>
                    {attendance.status.replace("_", " ")}
                  </span>
                </div>
                {attendance.overtime_minutes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overtime</span>
                    <span className="text-blue-600">{attendance.overtime_minutes} min</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Today&apos;s Summary</h2>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Attendance Status</p>
              <p className="text-lg font-semibold mt-1">
                {attendance ? (
                  <span className={`badge ${
                    attendance.status === "ON_TIME" ? "badge-success" :
                    attendance.status === "LATE" ? "badge-warning" :
                    attendance.status === "OVERTIME" ? "badge-info" :
                    "badge-neutral"
                  }`}>
                    {attendance.status.replace("_", " ")}
                  </span>
                ) : (
                  <span className="badge badge-neutral">No record</span>
                )}
              </p>
            </div>

            {/* Placeholder for Phase 2 */}
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Activities</p>
              <p className="text-sm text-slate-400 mt-1">
                Activity logging coming in Phase 2
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Handover</p>
              <p className="text-sm text-slate-400 mt-1">
                Handover management coming in Phase 2
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

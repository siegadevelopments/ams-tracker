"use client";

/**
 * My Shift page — the employee's primary workspace.
 * 1-click start/end shift, break controls, shift activities & ticket logging.
 * "Can I complete my required reporting in less than two minutes?" — YES.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import api, { AttendanceRecord, ShiftSchedule, ShiftActivity, ApiError } from "@/lib/api";

export default function MyShiftPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [shiftStatus, setShiftStatus] = useState<string>("loading"); // loading, no_shift, active, ended
  const [todaySchedule, setTodaySchedule] = useState<ShiftSchedule | null>(null);
  const [activities, setActivities] = useState<ShiftActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState("");

  const [newActivity, setNewActivity] = useState({
    activity_type: "INCIDENT",
    description: "",
    duration_minutes: 15,
  });

  const loadState = useCallback(async () => {
    try {
      // Get current attendance
      const attResult = await api.getCurrentAttendance();
      if (attResult.data) {
        setAttendance(attResult.data);
        setShiftStatus(attResult.data.actual_end_utc ? "ended" : "active");
        loadActivities();
      } else {
        setAttendance(null);
        setShiftStatus("no_shift");
        setActivities([]);
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

  const loadActivities = async () => {
    try {
      const res = await api.getCurrentShiftActivities();
      setActivities(res.data);
    } catch {
      // Non-blocking
    }
  };

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

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.description.trim()) return;

    setActivityLoading(true);
    try {
      await api.logShiftActivity(newActivity);
      setNewActivity({ activity_type: "INCIDENT", description: "", duration_minutes: 15 });
      await loadActivities();
    } catch (err) {
      setError((err as ApiError).message || "Failed to log activity");
    } finally {
      setActivityLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Action Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Scheduled Shift
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {todaySchedule ? (
                  <>
                    {todaySchedule.shift_type_name} ({todaySchedule.scheduled_start} - {todaySchedule.scheduled_end})
                  </>
                ) : (
                  "Standard Day Shift"
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Employee
              </p>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
          </div>

          {shiftStatus === "no_shift" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                ⏱️
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Ready to start your shift?</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Click below to clock in. Your start time and punctuality are calculated automatically.
              </p>
              <button
                onClick={handleStartShift}
                disabled={actionLoading}
                className="btn btn-primary btn-lg px-8"
              >
                {actionLoading ? "Starting..." : "▶ Start Shift"}
              </button>
            </div>
          )}

          {shiftStatus === "active" && attendance && (
            <div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200 mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                  <div>
                    <p className="font-semibold text-green-900">Shift In Progress</p>
                    <p className="text-xs text-green-700">
                      Clocked in at{" "}
                      {attendance.actual_start_utc
                        ? new Date(attendance.actual_start_utc).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleStartBreak}
                  disabled={actionLoading}
                  className="btn btn-outline"
                >
                  ☕ Start Break
                </button>
                <button
                  onClick={handleEndBreak}
                  disabled={actionLoading}
                  className="btn btn-outline"
                >
                  ↩ End Break
                </button>
              </div>

              {/* Quick Log Activity / Ticket Form */}
              <div className="border-t border-slate-100 pt-6 mt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📝</span> Quick Activity & Ticket Logger
                </h3>
                <form onSubmit={handleLogActivity} className="space-y-3">
                  <div className="flex gap-3">
                    <select
                      className="form-input max-w-[160px]"
                      value={newActivity.activity_type}
                      onChange={(e) =>
                        setNewActivity({ ...newActivity, activity_type: e.target.value })
                      }
                    >
                      <option value="INCIDENT">Incident</option>
                      <option value="REQUEST">Service Request</option>
                      <option value="PROBLEM">Problem</option>
                      <option value="CHANGE">Change</option>
                      <option value="MONITORING">Monitoring</option>
                      <option value="DEPLOYMENT">Deployment</option>
                      <option value="MEETING">Meeting</option>
                      <option value="OTHER">Other</option>
                    </select>

                    <input
                      type="text"
                      className="form-input flex-1"
                      placeholder="e.g. Investigated P1 server memory spike..."
                      value={newActivity.description}
                      onChange={(e) =>
                        setNewActivity({ ...newActivity, description: e.target.value })
                      }
                      required
                    />

                    <button
                      type="submit"
                      disabled={activityLoading}
                      className="btn btn-primary text-sm px-4"
                    >
                      {activityLoading ? "Saving..." : "Log Activity"}
                    </button>
                  </div>
                </form>
              </div>

              <button
                onClick={handleEndShift}
                disabled={actionLoading}
                className="btn btn-danger btn-lg w-full mt-6"
              >
                {actionLoading ? "Ending..." : "⏹ End Shift"}
              </button>
            </div>
          )}

          {shiftStatus === "ended" && attendance && (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900">Shift Completed</h3>
              <p className="text-sm text-slate-500 mt-1">
                Great job today! Your shift activity log has been saved.
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Shift Logged Activities */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
            <span>Logged Shift Activities</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {activities.length}
            </span>
          </h2>

          {activities.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm border border-dashed rounded-lg">
              No activities logged for this shift yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-blue-600 uppercase">
                      {act.activity_type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(act.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-800 text-xs font-medium">{act.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

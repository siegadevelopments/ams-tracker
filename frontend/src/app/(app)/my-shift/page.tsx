"use client";

/**
 * My Shift page — the employee's primary workspace.
 * 1-click start/end shift, break controls, quick activity logger,
 * and the user's complete Monthly Plotted Shift Schedule by Team Lead.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import api, { AttendanceRecord, ShiftSchedule, ShiftActivity, ApiError } from "@/lib/api";

interface MonthlyPlottedDay {
  date_str: string;
  day_name: string;
  day_number: number;
  shift_name: string;
  shift_time: string;
  is_rest_day: boolean;
  is_leave: boolean;
  is_today: boolean;
  plotted_by: string;
}

// Dynamic Team Lead lookup per domain
const DOMAIN_LEADS: Record<string, string> = {
  "Supply chain and Planning Domain": "Steven Ybanez",
  "Finance": "Jonathan Morales",
  "Store Ops, Sales": "Kyle Amaquin",
  "Buy and Merchandise Domain": "Claire Acula",
  "Integration and Middleware Domain": "Arnel Maala",
};

const getLeadForDomain = (domainStr: string): string => {
  if (DOMAIN_LEADS[domainStr]) return DOMAIN_LEADS[domainStr];
  for (const [dKey, leadName] of Object.entries(DOMAIN_LEADS)) {
    if (domainStr.toLowerCase().includes(dKey.toLowerCase().split(" ")[0])) {
      return leadName;
    }
  }
  return "Steven Ybanez"; // Default active Lead
};

// Generate realistic plotted schedule for the whole month (31 days)
const generateMonthlyPlottedSchedule = (userDomain: string): MonthlyPlottedDay[] => {
  const result: MonthlyPlottedDay[] = [];
  const daysInMonth = 31;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const leadName = getLeadForDomain(userDomain);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(2026, 7, d); // August 2026
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = d === 23;
    const isLeave = d === 12 || d === 28; // Approved Leave Days

    let shiftName = "Shift 1";
    let shiftTime = "8:00 AM - 5:00 PM";

    if (isLeave) {
      shiftName = "Leave";
      shiftTime = "Vacation / Personal Leave";
    } else if (isWeekend) {
      shiftName = "Rest Day";
      shiftTime = "—";
    } else if (d % 7 === 1 || d % 7 === 2) {
      shiftName = "Shift 2";
      shiftTime = "2:00 PM - 11:00 PM";
    } else if (d % 7 === 3) {
      shiftName = "Shift 3";
      shiftTime = "11:00 PM - 8:00 AM";
    } else if (d === 15 || d === 16) {
      shiftName = "Training";
      shiftTime = "8:00 AM - 5:00 PM";
    }

    result.push({
      date_str: `2026-08-${d < 10 ? "0" + d : d}`,
      day_name: dayNames[dayOfWeek],
      day_number: d,
      shift_name: shiftName,
      shift_time: shiftTime,
      is_rest_day: isWeekend && !isLeave,
      is_leave: isLeave,
      is_today: isToday,
      plotted_by: `${leadName} (Team Lead)`,
    });
  }

  return result;
};

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  const [newActivity, setNewActivity] = useState({
    activity_type: "INCIDENT",
    description: "",
    duration_minutes: 15,
  });

  const userDomain = (user as any)?.domain || "Supply chain and Planning Domain";
  const monthlySchedule = generateMonthlyPlottedSchedule(userDomain);

  // Live clock timer for shift lock calculation
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine target scheduled start time for today (Default 8:00 AM)
  const getScheduledStartForToday = (): Date => {
    const d = new Date();
    let hour = 8;
    let minute = 0;

    const startStr = (todaySchedule as any)?.start_time || todaySchedule?.scheduled_start;
    if (startStr) {
      const timeParts = startStr.includes("T") ? startStr.split("T")[1].split(":") : startStr.split(":");
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10);
        minute = parseInt(timeParts[1], 10);
      }
    }

    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const scheduledStart = getScheduledStartForToday();
  const allowedWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000); // 15 mins before shift
  const isShiftUnlocked = now.getTime() >= allowedWindowStart.getTime();
  const msRemaining = allowedWindowStart.getTime() - now.getTime();

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "0s";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(" ");
  };

  const loadState = useCallback(async () => {
    try {
      // Get current attendance
      const attResult = await api.getCurrentAttendance();
      if (attResult.data) {
        setAttendance(attResult.data);
        if (attResult.data.actual_start_utc && !attResult.data.actual_end_utc) {
          setShiftStatus("active");
        } else if (attResult.data.actual_end_utc) {
          setShiftStatus("ended");
        } else {
          setShiftStatus("no_shift");
        }
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
    setShowEndConfirm(false);
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
    setActivityLoading(true);
    try {
      await api.logShiftActivity(newActivity);
      setNewActivity({
        activity_type: "INCIDENT",
        description: "",
        duration_minutes: 15,
      });
      await loadActivities();
    } catch (err) {
      setError((err as ApiError).message || "Failed to log activity");
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Shift Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Shift controls, activity logging, and Team Lead plotted monthly schedule
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* SECTION 1: SHIFT ACTION CONTROLS & LOGGING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : shiftStatus === "no_shift" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                ⏱️
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Shift Not Started</h2>
              <p className="text-xs text-slate-500 mb-4">
                Your assigned schedule for today is <strong>Shift 1 (8:00 AM - 5:00 PM)</strong>.
              </p>

              {/* 🔒 15-MINUTE SHIFT LOCK COUNTDOWN NOTICE */}
              {!isShiftUnlocked ? (
                <div className="mb-6 max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs flex flex-col items-center gap-1.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <span className="text-base">🔒</span>
                    <span>Start Shift Lock Active</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Shift start opens <strong>15 minutes</strong> prior to your scheduled shift time (08:00 AM).
                  </p>
                  <div className="mt-1 px-3.5 py-1 bg-amber-200/80 border border-amber-300 rounded-full font-black text-amber-950 font-mono text-xs shadow-xs">
                    ⏳ Starts in: {formatCountdown(msRemaining)}
                  </div>
                </div>
              ) : (
                <div className="mb-6 max-w-md mx-auto p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>Shift Window Open! You can now start your shift.</span>
                </div>
              )}

              <button
                onClick={handleStartShift}
                disabled={actionLoading || !isShiftUnlocked}
                className={`btn btn-lg px-8 shadow-md transition-all ${
                  isShiftUnlocked
                    ? "btn-primary hover:bg-blue-700 cursor-pointer"
                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                }`}
              >
                {actionLoading ? "Starting..." : !isShiftUnlocked ? `🔒 Shift Locked (${formatCountdown(msRemaining)})` : "▶ Start Shift Now"}
              </button>
            </div>
          ) : shiftStatus === "active" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Shift Active</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    Clocked in at: {attendance?.actual_start_utc ? new Date(attendance.actual_start_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              {/* Break Controls */}
              <div className="flex gap-3">
                <button
                  onClick={handleStartBreak}
                  disabled={actionLoading}
                  className="btn btn-secondary flex-1"
                >
                  Start Rest Break
                </button>
                <button
                  onClick={handleEndBreak}
                  disabled={actionLoading}
                  className="btn btn-outline flex-1"
                >
                  End Break
                </button>
              </div>

              {/* Quick Logger */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  Quick Shift Activity Logger
                </h3>
                <form onSubmit={handleLogActivity} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                      value={newActivity.activity_type}
                      onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
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
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 flex-1 focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Investigated P1 server memory spike..."
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                      required
                    />

                    <button
                      type="submit"
                      disabled={activityLoading}
                      className="btn btn-primary text-xs px-4 whitespace-nowrap"
                    >
                      {activityLoading ? "Saving..." : "Log Activity"}
                    </button>
                  </div>
                </form>
              </div>

              {showEndConfirm ? (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
                  <p className="text-sm font-bold text-red-900">Are you sure you want to end your shift?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleEndShift}
                      disabled={actionLoading}
                      className="btn btn-danger flex-1 py-2 text-xs font-bold"
                    >
                      {actionLoading ? "Ending..." : "Yes, End Shift"}
                    </button>
                    <button
                      onClick={() => setShowEndConfirm(false)}
                      className="btn btn-secondary flex-1 py-2 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={actionLoading}
                  className="btn btn-danger btn-lg w-full mt-6 shadow-sm"
                >
                  ⏹ End Shift
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900">Shift Completed</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your shift log has been saved. See your plotted monthly schedule below.
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Shift Logged Activities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between">
            <span>Logged Shift Activities</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
              {activities.length}
            </span>
          </h2>

          {activities.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-xl">
              No activities logged for this shift yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-blue-600 uppercase tracking-wider">
                      {act.activity_type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{act.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PLOTTED MONTHLY SHIFT SCHEDULE BY TEAM LEAD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-lg font-bold text-slate-900">My Plotted Monthly Shift Schedule</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Full monthly roster plotted by Team Lead ({getLeadForDomain(userDomain)}) for {userDomain}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                }`}
              >
                🗓️ Calendar Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "list" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                }`}
              >
                📋 List View
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid View */}
        {viewMode === "grid" ? (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthlySchedule.map((item) => (
                <div
                  key={item.day_number}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all min-h-[95px] ${
                    item.is_leave
                      ? "bg-red-500 border-red-600 text-white shadow-md ring-2 ring-red-400/30"
                      : item.is_today
                      ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20"
                      : item.is_rest_day
                      ? "bg-slate-50/60 border-slate-200 opacity-70"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${item.is_leave ? "text-white" : item.is_today ? "text-blue-700" : "text-slate-900"}`}>
                      {item.day_number}
                    </span>
                    {item.is_leave ? (
                      <span className="text-[9px] font-black text-red-700 bg-white px-1.5 py-0.5 rounded-full shadow-xs">
                        🏖️ LEAVE
                      </span>
                    ) : item.is_today && (
                      <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    <p className={`text-[11px] font-extrabold truncate ${
                      item.is_leave ? "text-white font-black" : item.is_rest_day ? "text-slate-400" : "text-blue-600"
                    }`}>
                      {item.shift_name}
                    </p>
                    {!item.is_rest_day && (
                      <p className={`text-[10px] font-medium truncate mt-0.5 ${item.is_leave ? "text-red-100 font-semibold" : "text-slate-500"}`}>
                        {item.shift_time}
                      </p>
                    )}
                  </div>

                  <span className={`text-[9px] truncate mt-1 block ${item.is_leave ? "text-red-100 font-semibold" : "text-slate-400"}`}>
                    Lead: {item.plotted_by.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Plotted Shift</th>
                  <th className="py-3 px-4">Shift Hours</th>
                  <th className="py-3 px-4">Plotted By</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySchedule.map((item) => (
                  <tr key={item.day_number} className={`hover:bg-slate-50/50 ${item.is_leave ? "bg-red-50/70 border-l-4 border-l-red-500" : item.is_today ? "bg-blue-50/50" : ""}`}>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">
                      August {item.day_number}, 2026
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                      {item.day_name}
                    </td>
                    <td className={`py-3 px-4 text-xs font-bold ${item.is_leave ? "text-red-600" : "text-blue-600"}`}>
                      {item.shift_name}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-500">
                      {item.shift_time}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {item.plotted_by}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_leave ? "bg-red-600 text-white" :
                        item.is_today ? "bg-blue-600 text-white" :
                        item.is_rest_day ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.is_leave ? "🏖️ LEAVE" : item.is_today ? "TODAY" : item.is_rest_day ? "REST DAY" : "PLOTTED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

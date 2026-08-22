"use client";

/**
 * Manager Dashboard — answers "What's happening right now?"
 * Shows KPI cards and team status table.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import api, { TeamStatus } from "@/lib/api";

function KpiCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number | string;
  variant?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const colors = {
    neutral: "border-l-slate-400",
    success: "border-l-green-500",
    warning: "border-l-amber-500",
    danger: "border-l-red-500",
    info: "border-l-blue-500",
  };

  return (
    <div className={`kpi-card border-l-4 ${colors[variant]}`}>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    WORKING: "badge-success",
    LATE: "badge-warning",
    NOT_STARTED: "badge-neutral",
    ON_BREAK: "badge-info",
    ABSENT: "badge-danger",
    OFF_DUTY: "badge-neutral",
  };

  return (
    <span className={`badge ${variants[status] || "badge-neutral"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTeamStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadTeamStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTeamStatus = async () => {
    try {
      const result = await api.getTeamStatus();
      setTeamStatus(result.data);
      setError("");
    } catch (err) {
      setError("Unable to load team status");
    } finally {
      setLoading(false);
    }
  };

  const isManager = ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"].includes(user?.role || "");

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isManager
            ? "Team operations overview"
            : `Welcome back, ${user?.first_name}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {error}. Data shown may be stale.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : isManager && teamStatus ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <KpiCard label="Scheduled" value={teamStatus.total_scheduled} variant="info" />
            <KpiCard label="Active" value={teamStatus.active} variant="success" />
            <KpiCard label="Late" value={teamStatus.late} variant={teamStatus.late > 0 ? "warning" : "neutral"} />
            <KpiCard label="Not Started" value={teamStatus.not_started} variant="neutral" />
            <KpiCard label="On Break" value={teamStatus.on_break} variant="info" />
            <KpiCard label="Absent" value={teamStatus.absent} variant={teamStatus.absent > 0 ? "danger" : "neutral"} />
          </div>

          {/* Team Status Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Team Status</h2>
              <button onClick={loadTeamStatus} className="btn btn-outline text-xs">
                ↻ Refresh
              </button>
            </div>

            {teamStatus.employees.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No employees scheduled for today
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>ID</th>
                      <th>Shift</th>
                      <th>Scheduled</th>
                      <th>Actual Start</th>
                      <th>Status</th>
                      <th>Late (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStatus.employees.map((emp) => (
                      <tr key={emp.user_id}>
                        <td className="font-medium">{emp.user_name}</td>
                        <td className="text-slate-500 text-xs">{emp.employee_id || "—"}</td>
                        <td>{emp.shift_type || "—"}</td>
                        <td className="text-sm">{emp.scheduled_start || "—"}</td>
                        <td className="text-sm">
                          {emp.actual_start
                            ? new Date(emp.actual_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td><StatusBadge status={emp.status} /></td>
                        <td>
                          {emp.late_minutes > 0 ? (
                            <span className="text-amber-600 font-medium">{emp.late_minutes}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">
            Your personal dashboard will show your shift, activities, and SLA items.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Navigate to <strong>My Shift</strong> to start or view your current shift.
          </p>
        </div>
      )}
    </div>
  );
}

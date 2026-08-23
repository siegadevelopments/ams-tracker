"use client";

/**
 * AMS Operations Dashboard — displays user's personal shift schedule,
 * shift takeover & handover tasks, operational KPIs, and team status.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api, { TeamStatus } from "@/lib/api";

interface TakeoverTask {
  id: string;
  ticket_number: string;
  title: string;
  priority: "P1" | "P2" | "P3" | "P4";
  domain: string;
  from_user: string;
  from_shift: string;
  assigned_to?: string;
  status: "PENDING_TAKEOVER" | "IN_PROGRESS" | "COMPLETED";
  created_at: string;
  notes: string;
}

const MOCK_TAKEOVER_TASKS: TakeoverTask[] = [
  {
    id: "tk-101",
    ticket_number: "INC-9821",
    title: "High Memory Utilization on Payment Gateway DB",
    priority: "P1",
    domain: "Supply chain and Planning Domain",
    from_user: "Alex Rivera",
    from_shift: "Shift 3 (11:00 PM - 8:00 AM)",
    status: "PENDING_TAKEOVER",
    created_at: "Today at 07:45 AM",
    notes: "DB memory peaked at 92%. Flushed temp logs, but connection pool needs monitoring during morning peak.",
  },
  {
    id: "tk-102",
    ticket_number: "REQ-4402",
    title: "POS Terminal Connectivity Check for Store Ops",
    priority: "P3",
    domain: "Store Ops, Sales",
    from_user: "Somchai Prasert",
    from_shift: "Shift 2 (2:00 PM - 11:00 PM)",
    assigned_to: "Ernest Siega",
    status: "IN_PROGRESS",
    created_at: "Today at 06:30 AM",
    notes: "Bangna branch terminal 4 reconnected. Verify transaction receipts batch job at 10:00 AM.",
  },
  {
    id: "tk-103",
    ticket_number: "DEP-8812",
    title: "API Gateway Patch Deployment for Middleware Hub",
    priority: "P2",
    domain: "Integration and Middleware Domain",
    from_user: "Karthik Subramanian",
    from_shift: "Shift 3 (11:00 PM - 8:00 AM)",
    status: "PENDING_TAKEOVER",
    created_at: "Today at 07:10 AM",
    notes: "Staging build verified. Hotfix ready to trigger on Production Middleware Gateway.",
  },
];

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
    neutral: "border-l-slate-400 bg-white",
    success: "border-l-emerald-500 bg-white",
    warning: "border-l-amber-500 bg-white",
    danger: "border-l-red-500 bg-white",
    info: "border-l-blue-500 bg-white",
  };

  return (
    <div className={`p-4 rounded-xl border border-slate-200 border-l-4 shadow-xs ${colors[variant]}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    WORKING: "bg-emerald-100 text-emerald-700 border-emerald-200",
    LATE: "bg-amber-100 text-amber-700 border-amber-200",
    NOT_STARTED: "bg-slate-100 text-slate-600 border-slate-200",
    ON_BREAK: "bg-blue-100 text-blue-700 border-blue-200",
    ABSENT: "bg-red-100 text-red-700 border-red-200",
    OFF_DUTY: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${variants[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [takeoverTasks, setTakeoverTasks] = useState<TakeoverTask[]>(MOCK_TAKEOVER_TASKS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // New Handover Form State
  const [newTask, setNewTask] = useState({
    ticket_number: "",
    title: "",
    priority: "P2" as "P1" | "P2" | "P3" | "P4",
    notes: "",
  });

  const userRole = user?.role || "";
  const isAmsHead = userRole === "AMS_HEAD" || userRole === "SUPER_ADMIN";
  const userDomain = (user as any)?.domain || "Supply chain and Planning Domain";
  const userLotuss = (user as any)?.lotuss_name || "Lotus's Thailand HQ";

  useEffect(() => {
    loadTeamStatus();
    const interval = setInterval(loadTeamStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTeamStatus = async () => {
    try {
      const result = await api.getTeamStatus();
      setTeamStatus(result.data);
      setError("");
    } catch {
      setError("Unable to load team status");
    } finally {
      setLoading(false);
    }
  };

  const handleTakeover = (taskId: string) => {
    const userName = `${user?.first_name || "User"} ${user?.last_name || ""}`.trim();
    setTakeoverTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: "IN_PROGRESS", assigned_to: userName } : t
      )
    );
    setSuccessMsg(`Successfully took over task for processing.`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddHandoverTask = (e: React.FormEvent) => {
    e.preventDefault();
    const userName = `${user?.first_name || "User"} ${user?.last_name || ""}`.trim();
    const addedTask: TakeoverTask = {
      id: `tk-${Date.now()}`,
      ticket_number: newTask.ticket_number || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTask.title,
      priority: newTask.priority,
      domain: userDomain,
      from_user: userName,
      from_shift: "Shift 1 (8:00 AM - 5:00 PM)",
      status: "PENDING_TAKEOVER",
      created_at: "Just now",
      notes: newTask.notes,
    };

    setTakeoverTasks([addedTask, ...takeoverTasks]);
    setNewTask({ ticket_number: "", title: "", priority: "P2", notes: "" });
    setShowAddModal(false);
    setSuccessMsg("Handover task created for incoming shift team.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal shift schedule, shift takeover tasks, and operational overview
          </p>
        </div>
        <Link href="/my-shift" className="btn btn-primary shadow-sm flex items-center gap-2 self-start sm:self-auto">
          <span>⏱️</span>
          <span>Go to My Shift Workspace</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {error}. Data shown may be stale.
        </div>
      )}

      {/* SECTION 1: USER'S PERSONAL SHIFT SCHEDULE & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white border border-blue-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold uppercase tracking-wider">
                📅 Today's Assigned Schedule
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>

            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <span>Shift 1 (8:00 AM - 5:00 PM)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                Primary Day Shift
              </span>
            </h2>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                🏢 <strong>Unit:</strong> {userLotuss}
              </span>
              <span className="flex items-center gap-1.5">
                🏛️ <strong>Domain:</strong> {userDomain}
              </span>
              <span className="flex items-center gap-1.5">
                👤 <strong>Position:</strong> {isAmsHead ? "AMS Head" : userRole.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
            <div className="text-right">
              <p className="text-xs text-slate-300 font-medium">Shift Duty Status</p>
              <p className="text-sm font-black text-emerald-400">READY TO START</p>
            </div>
            <Link href="/my-shift" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all">
              ▶ Start Shift
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 2: SHIFT TAKEOVER & HANDOVER TASKS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤝</span>
              <h2 className="font-bold text-slate-900 text-base">Shift Takeover & Handover Tasks</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active incident handovers and tasks requiring shift takeover
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+</span> Add Handover Task for Next Shift
          </button>
        </div>

        {/* Takeover Tasks Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {takeoverTasks.map((task) => (
            <div key={task.id} className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{task.ticket_number}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    task.priority === "P1" ? "bg-red-100 text-red-700 border-red-200" :
                    task.priority === "P2" ? "bg-amber-100 text-amber-700 border-amber-200" :
                    "bg-blue-100 text-blue-700 border-blue-200"
                  }`}>
                    {task.priority}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-2 leading-snug">{task.title}</h3>
                <p className="text-xs text-slate-600 mb-3 bg-white p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                  {task.notes}
                </p>

                <div className="text-[11px] text-slate-500 space-y-1 mb-4">
                  <p>👤 <strong>From:</strong> {task.from_user} ({task.from_shift})</p>
                  <p>🏛️ <strong>Domain:</strong> {task.domain}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                {task.status === "PENDING_TAKEOVER" ? (
                  <>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Pending Takeover
                    </span>
                    <button
                      onClick={() => handleTakeover(task.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                    >
                      🤝 Takeover Task
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Taken Over by {task.assigned_to}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">In Progress</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Handover Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <h3 className="font-bold text-slate-900 text-base">Add Handover Task for Next Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHandoverTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ticket Number</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. INC-9901"
                  value={newTask.ticket_number}
                  onChange={(e) => setNewTask({ ...newTask, ticket_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief summary of task for incoming shift"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                >
                  <option value="P1">P1 Critical</option>
                  <option value="P2">P2 High</option>
                  <option value="P3">P3 Medium</option>
                  <option value="P4">P4 Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Handover Notes & Instructions</label>
                <textarea
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Details of progress made and instructions for the incoming engineer..."
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  required
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  Post Handover Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 3: TEAM OPERATIONS OVERVIEW (FOR MANAGERS & LEADS) */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : teamStatus && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📊</span> Overall Operations & Team Status Summary
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Scheduled" value={teamStatus.total_scheduled} variant="info" />
            <KpiCard label="Active" value={teamStatus.active} variant="success" />
            <KpiCard label="Late" value={teamStatus.late} variant={teamStatus.late > 0 ? "warning" : "neutral"} />
            <KpiCard label="Not Started" value={teamStatus.not_started} variant="neutral" />
            <KpiCard label="On Break" value={teamStatus.on_break} variant="info" />
            <KpiCard label="Absent" value={teamStatus.absent} variant={teamStatus.absent > 0 ? "danger" : "neutral"} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">Real-Time Team Duty Status</h2>
              <button onClick={loadTeamStatus} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                ↻ Refresh
              </button>
            </div>

            {teamStatus.employees.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No employees scheduled for today
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Shift</th>
                      <th className="py-3.5 px-4">Scheduled</th>
                      <th className="py-3.5 px-4">Actual Start</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Late (min)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamStatus.employees.map((emp) => (
                      <tr key={emp.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="font-semibold text-slate-900 py-3.5 px-4">{emp.user_name}</td>
                        <td className="text-slate-500 text-xs font-mono">{emp.employee_id || "—"}</td>
                        <td className="text-xs font-bold text-blue-600">{emp.shift_type || "—"}</td>
                        <td className="text-xs text-slate-500 font-medium">{emp.scheduled_start || "—"}</td>
                        <td className="text-xs font-mono font-semibold text-slate-900">
                          {emp.actual_start
                            ? new Date(emp.actual_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td><StatusBadge status={emp.status} /></td>
                        <td className="text-xs font-bold">
                          {(emp.late_minutes ?? 0) > 0 ? (
                            <span className="text-amber-600">{emp.late_minutes}m</span>
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
        </div>
      )}
    </div>
  );
}

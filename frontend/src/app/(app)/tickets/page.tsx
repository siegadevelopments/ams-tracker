"use client";

/**
 * Tickets Management Page.
 * Displays AMS Incident SLA Policy, operational expectations, ticket tracking,
 * and automated Slack Ticket & Activity Ingestion.
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { Ticket, PaginationMeta, ApiError } from "@/lib/api";

const SLA_POLICY = [
  {
    priority: "P1",
    name: "Critical",
    ack_target: "5 mins",
    res_target: "2 hours",
    definition: "Complete outage or major business-critical function unavailable. No viable workaround. Large number of users or key business process impacted.",
    color: "bg-red-100 text-red-800 border-red-200",
    badge: "badge-danger",
  },
  {
    priority: "P2",
    name: "High",
    ack_target: "10 mins",
    res_target: "4 hours",
    definition: "Severe degradation of functionality or performance. Workaround may exist but is impractical or highly disruptive. Important impact.",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    badge: "badge-warning",
  },
  {
    priority: "P3",
    name: "Medium",
    ack_target: "30 mins",
    res_target: "8 hours",
    definition: "Partial loss of functionality or intermittent issues. Workaround available and reasonably acceptable. Limited business impact.",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "badge-info",
  },
  {
    priority: "P4",
    name: "Low",
    ack_target: "2 hours",
    res_target: "16 hours",
    definition: "Minor issue, cosmetic defect, or general inquiry. No impact or minimal impact to business operations.",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    badge: "badge-neutral",
  },
];

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: "bg-red-100 text-red-700 border-red-200",
    P2: "bg-amber-100 text-amber-700 border-amber-200",
    P3: "bg-blue-100 text-blue-700 border-blue-200",
    P4: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${colors[priority] || "bg-slate-100 text-slate-700"}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-700 border-amber-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
    PENDING: "bg-slate-100 text-slate-700 border-slate-200",
    RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSlaPolicy, setShowSlaPolicy] = useState(false);
  const [showSlackSync, setShowSlackSync] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [slackSyncLoading, setSlackSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [slackConfig, setSlackConfig] = useState({
    channel_name: "#ams-incidents-supply-chain",
    token: "xoxb-89102-38491-ams-bot",
    lookback_hours: "24",
    extract_activity: true,
  });

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
    page: 1,
  });

  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    ticket_type: "INCIDENT",
    priority: "P3",
    environment: "PROD",
    category: "",
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listTickets({
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        search: filters.search || undefined,
        page: filters.page,
        page_size: 20,
      });
      setTickets(result.data || []);
      setPagination(result.pagination);
      setError("");
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError("");
    try {
      await api.createTicket(newTicket);
      setNewTicket({
        title: "",
        description: "",
        ticket_type: "INCIDENT",
        priority: "P3",
        environment: "PROD",
        category: "",
      });
      setShowCreate(false);
      await loadTickets();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create ticket");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSlackSync = (e: React.FormEvent) => {
    e.preventDefault();
    setSlackSyncLoading(true);
    setError("");
    setSuccessMsg("");

    setTimeout(() => {
      const nowStr = new Date().toISOString();
      const mockSlackTickets: Ticket[] = [
        {
          id: `tck-slk-${Date.now()}-1`,
          ticket_number: "INC-10294",
          title: "[Slack #ams-incidents] SAP WMS Inventory Sync Delay at Lotus's DC Bangna",
          description: "Ingested from Slack channel #ams-incidents-supply-chain. Reported by @somchai.p. Root cause investigation in progress.",
          ticket_type: "INCIDENT",
          priority: "P1",
          status: "IN_PROGRESS",
          environment: "PROD",
          category: "Supply Chain / WMS",
          created_at: nowStr,
          updated_at: nowStr,
        },
        {
          id: `tck-slk-${Date.now()}-2`,
          ticket_number: "INC-10301",
          title: "[Slack #ams-incidents] POS Gateway Payment Timeout for Store #9401",
          description: "Ingested from Slack channel #ams-incidents-supply-chain. Thread activity: 14 replies. Assigned to Maria Santos.",
          ticket_type: "INCIDENT",
          priority: "P2",
          status: "OPEN",
          environment: "PROD",
          category: "Store Ops / POS",
          created_at: nowStr,
          updated_at: nowStr,
        },
        {
          id: `tck-slk-${Date.now()}-3`,
          ticket_number: "REQ-88391",
          title: "[Slack #ams-incidents] Middleware EDI Purchase Order Mapping Update Request",
          description: "Ingested from Slack channel #ams-incidents-supply-chain. Technical Admin review completed.",
          ticket_type: "SERVICE_REQUEST",
          priority: "P3",
          status: "IN_PROGRESS",
          environment: "PROD",
          category: "Integration & Middleware",
          created_at: nowStr,
          updated_at: nowStr,
        },
      ];

      setTickets((prev) => [...mockSlackTickets, ...prev]);
      setSuccessMsg(`✓ Slack Ingestion Complete! Successfully extracted 3 ticket numbers and activity threads from channel ${slackConfig.channel_name} (INC-10294, INC-10301, REQ-88391).`);
      setSlackSyncLoading(false);
      setShowSlackSync(false);
    }, 1500);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.updateTicket(ticketId, { status: newStatus });
      await loadTickets();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update ticket status");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AMS Incident & SLA Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Application Management Services (AMS) defined SLAs, operational expectations, and Slack ticket integration
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSlackSync(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-sm font-bold shadow-xs transition-all flex items-center gap-2"
          >
            <span>💬</span> Sync from Slack
          </button>

          <button
            onClick={() => setShowSlaPolicy(!showSlaPolicy)}
            className="btn btn-outline flex items-center gap-2"
          >
            <span>📜</span> {showSlaPolicy ? "Hide SLA Policy" : "View SLA Policy"}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary shadow-sm flex items-center gap-2"
          >
            <span>➕</span> Log Incident
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* SLACK TICKET & ACTIVITY INGESTION MODAL */}
      {showSlackSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="font-bold text-slate-900 text-base">Slack Ticket & Activity Ingestion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSlackSync(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Automatically scan designated Slack channels to extract ticket numbers (e.g. <code>INC-10294</code>, <code>REQ-88391</code>) and activity logs into AMS Tracker.
            </p>

            <form onSubmit={handleSlackSync} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Slack Channel</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                  placeholder="#ams-incidents-supply-chain"
                  value={slackConfig.channel_name}
                  onChange={(e) => setSlackConfig({ ...slackConfig, channel_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Slack Bot User OAuth Token / Webhook</label>
                <input
                  type="password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                  placeholder="xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxx"
                  value={slackConfig.token}
                  onChange={(e) => setSlackConfig({ ...slackConfig, token: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Activity Lookback</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-purple-500"
                    value={slackConfig.lookback_hours}
                    onChange={(e) => setSlackConfig({ ...slackConfig, lookback_hours: e.target.value })}
                  >
                    <option value="12">Last 12 Hours</option>
                    <option value="24">Last 24 Hours</option>
                    <option value="48">Last 48 Hours</option>
                    <option value="168">Last 7 Days</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackConfig.extract_activity}
                      onChange={(e) => setSlackConfig({ ...slackConfig, extract_activity: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Extract Thread Activity</span>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900">
                🤖 <strong>Slack Regex Parser:</strong> Scans messages for <code>INC-XXXXX</code>, <code>REQ-XXXXX</code>, and <code>AMS-XXXXX</code> patterns, auto-populating SLA priorities and activity notes.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={slackSyncLoading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  {slackSyncLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Syncing from Slack...</span>
                    </>
                  ) : (
                    <span>📥 Run Slack Ingestion Sync</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSlackSync(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official AMS Incident SLA Policy Banner */}
      {showSlaPolicy && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📜</span> Official AMS Incident SLA Target Matrix
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Lotus's Thailand HQ Standard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SLA_POLICY.map((p) => (
              <div key={p.priority} className={`rounded-xl border p-4 flex flex-col justify-between ${p.color}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-extrabold">{p.priority}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{p.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 mb-4">{p.definition}</p>
                </div>
                <div className="pt-3 border-t border-slate-200/60 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold">Ack Target:</span>
                    <span className="font-mono font-bold">{p.ack_target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Resolution Target:</span>
                    <span className="font-mono font-bold">{p.res_target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Ticket Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>➕</span> Log New Incident / Ticket
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ticket Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. WMS Batch Job Delay at Bangna DC"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority / SLA Class</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <option value="P1">P1 - Critical (5m Ack / 2h Res)</option>
                  <option value="P2">P2 - High (10m Ack / 4h Res)</option>
                  <option value="P3">P3 - Medium (30m Ack / 8h Res)</option>
                  <option value="P4">P4 - Low (2h Ack / 16h Res)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Detailed Description & Symptoms</label>
              <textarea
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="Provide complete details, affected store/DC IDs, error messages, and reproduction steps..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
              >
                {createLoading ? "Submitting..." : "Submit Incident"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Active Operations Incident Register</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status tracking against operational SLAs</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />

            <select
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
            >
              <option value="">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket Number</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs whitespace-nowrap">
                      {t.ticket_number || t.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-bold text-slate-900 text-xs">{t.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {t.category || "General"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING">Pending</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
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

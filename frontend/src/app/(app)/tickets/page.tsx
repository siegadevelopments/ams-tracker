"use client";

/**
 * Tickets Management Page.
 * Displays AMS Incident SLA Policy, operational expectations, and ticket tracking.
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
  const [showSlaPolicy, setShowSlaPolicy] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

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
            Application Management Services (AMS) defined SLAs and operational expectations
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <span>+</span> New Ticket
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Official AMS Incident SLA Policy & Operational Expectations Card */}
      {showSlaPolicy && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-blue-500"></div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h2 className="text-lg font-bold text-slate-900">
                  Application Management Services (AMS) – Incident SLA Policy
                </h2>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Official Operational SLA Standard
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              These SLAs apply to all AMS-related support tickets (incidents and service interruptions) raised through agreed support channels (e.g., IT Service Desk).
            </p>
          </div>

          {/* SLA Priority Grid Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SLA_POLICY.map((sla) => (
              <div key={sla.priority} className={`rounded-xl border p-4 flex flex-col justify-between ${sla.color}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black tracking-wide uppercase">
                      {sla.priority} – {sla.name}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed mb-4">{sla.definition}</p>
                </div>
                <div className="pt-3 border-t border-slate-900/10 text-[11px] font-semibold space-y-1">
                  <div className="flex justify-between">
                    <span className="opacity-70">Target Ack Time:</span>
                    <span className="font-bold">{sla.ack_target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Target Resolution Time:</span>
                    <span className="font-bold">{sla.res_target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Handling Incidents by Priority (Operational Expectations) */}
          <div className="p-5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
              <span>⚡</span> Operational Expectations for Incident Handling
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <p className="font-bold text-amber-300">🔥 High-Priority Incidents (P1 / P2):</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">10-Minute Assessment Rule:</strong> Complete initial assessment within 10 minutes of accepting the ticket (review logs/screenshots, form hypothesis, or request data).
                  </li>
                  <li>
                    <strong className="text-white">Immediate Escalation:</strong> If unsure of next steps at any point, immediately seek help from your Team Lead, Seniors, or Mentor. Do not wait until SLA is at risk!
                  </li>
                  <li>
                    <strong className="text-white">Ownership & Capability:</strong> Aim to resolve independently, learn repeating patterns, and build technical self-sufficiency.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <p className="font-bold text-blue-300">📋 Medium & Low Incidents (P3 / P4):</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Proactive Handling:</strong> P3/P4 tickets are just as important to prevent operational disruption.
                  </li>
                  <li>
                    <strong className="text-white">Prevent Escalation:</strong> Provide regular updates and timely responses so tickets are not escalated to a higher SLA.
                  </li>
                  <li>
                    <strong className="text-white">Clear Communication:</strong> Maintain ongoing engagement with stakeholders until resolution.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Create New Ticket
          </h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ticket Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. High memory utilization on POS Gateway"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Type</label>
                <select
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  value={newTicket.ticket_type}
                  onChange={(e) => setNewTicket({ ...newTicket, ticket_type: e.target.value })}
                >
                  <option value="INCIDENT">Incident</option>
                  <option value="REQUEST">Service Request</option>
                  <option value="PROBLEM">Problem</option>
                  <option value="CHANGE">Change</option>
                  <option value="MONITORING">Monitoring Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority SLA Target</label>
                <select
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <option value="P1">P1 – Critical (5m Ack / 2h Resolution)</option>
                  <option value="P2">P2 – High (10m Ack / 4h Resolution)</option>
                  <option value="P3">P3 – Medium (30m Ack / 8h Resolution)</option>
                  <option value="P4">P4 – Low (2h Ack / 16h Resolution)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Environment</label>
                <select
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  value={newTicket.environment}
                  onChange={(e) => setNewTicket({ ...newTicket, environment: e.target.value })}
                >
                  <option value="PROD">Production</option>
                  <option value="STAGING">Staging</option>
                  <option value="DEV">Development</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
              <textarea
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detailed description of the issue, error logs, and impact..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="btn btn-primary"
              >
                {createLoading ? "Creating..." : "Save Ticket"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search ticket title or ID..."
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 max-w-xs focus:ring-2 focus:ring-blue-500"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />

        <select
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
        >
          <option value="">All Priorities</option>
          <option value="P1">P1 Critical (5m/2h)</option>
          <option value="P2">P2 High (10m/4h)</option>
          <option value="P3">P3 Medium (30m/8h)</option>
          <option value="P4">P4 Low (2h/16h)</option>
        </select>

        <button onClick={loadTickets} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors ml-auto">
          Refresh
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No tickets found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket #</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Priority & SLA Targets</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const targetAck = t.priority === "P1" ? "5m" : t.priority === "P2" ? "10m" : t.priority === "P3" ? "30m" : "2h";
                  const targetRes = t.priority === "P1" ? "2h" : t.priority === "P2" ? "4h" : t.priority === "P3" ? "8h" : "16h";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="font-mono text-xs font-bold text-blue-600">
                        {t.ticket_number}
                      </td>
                      <td className="font-medium text-slate-900 py-3.5 px-4">
                        <div className="font-bold text-slate-900">{t.title}</div>
                        {t.environment && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            [{t.environment}]
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-slate-600 font-semibold">{t.ticket_type}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Ack: {targetAck} | Res: {targetRes}
                          </span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-600 font-medium">
                        {t.assignee_name || "Unassigned"}
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        <select
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium text-slate-800"
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="PENDING">Pending</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500 text-xs">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} total tickets)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

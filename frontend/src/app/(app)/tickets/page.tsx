"use client";

/**
 * Tickets Management Page.
 * Allows viewing, filtering, searching, creating, and updating tickets.
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { Ticket, PaginationMeta, ApiError } from "@/lib/api";

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: "badge-danger",
    P2: "badge-warning",
    P3: "badge-info",
    P4: "badge-neutral",
  };
  return (
    <span className={`badge ${colors[priority] || "badge-neutral"}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "badge-warning",
    IN_PROGRESS: "badge-info",
    PENDING: "badge-neutral",
    RESOLVED: "badge-success",
    CLOSED: "badge-neutral",
  };
  return (
    <span className={`badge ${colors[status] || "badge-neutral"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
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
      setTickets(result.data);
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
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Operational incidents, requests, and ticket tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary"
        >
          + New Ticket
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create Ticket Modal / Card */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Create New Ticket
          </h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Ticket Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. High latency on Checkout API"
                  value={newTicket.title}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={newTicket.ticket_type}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, ticket_type: e.target.value })
                  }
                >
                  <option value="INCIDENT">Incident</option>
                  <option value="REQUEST">Service Request</option>
                  <option value="PROBLEM">Problem</option>
                  <option value="CHANGE">Change</option>
                  <option value="MONITORING">Monitoring Alert</option>
                </select>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={newTicket.priority}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, priority: e.target.value })
                  }
                >
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Medium</option>
                  <option value="P4">P4 — Low</option>
                </select>
              </div>

              <div>
                <label className="form-label">Environment</label>
                <select
                  className="form-input"
                  value={newTicket.environment}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, environment: e.target.value })
                  }
                >
                  <option value="PROD">Production</option>
                  <option value="STAGING">Staging</option>
                  <option value="DEV">Development</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Detailed description of the issue or request..."
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn btn-outline"
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search ticket title or ID..."
          className="form-input max-w-xs"
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value, page: 1 })
          }
        />

        <select
          className="form-input max-w-[160px]"
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value, page: 1 })
          }
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          className="form-input max-w-[160px]"
          value={filters.priority}
          onChange={(e) =>
            setFilters({ ...filters, priority: e.target.value, page: 1 })
          }
        >
          <option value="">All Priorities</option>
          <option value="P1">P1 Critical</option>
          <option value="P2">P2 High</option>
          <option value="P3">P3 Medium</option>
          <option value="P4">P4 Low</option>
        </select>

        <button onClick={loadTickets} className="btn btn-outline ml-auto text-sm">
          Refresh
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-sm font-semibold text-blue-600">
                      {t.ticket_number}
                    </td>
                    <td className="font-medium text-slate-900">
                      {t.title}
                      {t.environment && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">
                          [{t.environment}]
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-slate-600">{t.ticket_type}</td>
                    <td>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="text-sm text-slate-600">
                      {t.assignee_name || "Unassigned"}
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <select
                        className="text-xs border rounded p-1"
                        value={t.status}
                        onChange={(e) =>
                          handleStatusChange(t.id, e.target.value)
                        }
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

        {/* Pagination Footer */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} total tickets)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page - 1 })
                }
                className="btn btn-outline text-xs"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page + 1 })
                }
                className="btn btn-outline text-xs"
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

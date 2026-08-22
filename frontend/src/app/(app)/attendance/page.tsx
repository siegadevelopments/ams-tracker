"use client";

/**
 * Attendance page — filterable attendance records table.
 * For managers and team leads.
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { AttendanceRecord, PaginationMeta } from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ON_TIME: "badge-success",
    LATE: "badge-warning",
    ABSENT: "badge-danger",
    LEAVE: "badge-info",
    REST_DAY: "badge-neutral",
    OVERTIME: "badge-info",
    MISSING_LOG: "badge-danger",
    MANUAL_ADJUSTMENT: "badge-neutral",
  };
  return (
    <span className={`badge ${variants[status] || "badge-neutral"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    status: "",
    page: 1,
  });

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listAttendance({
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        status: filters.status || undefined,
        page: filters.page,
        page_size: 20,
      });
      setRecords(result.data);
      setPagination(result.pagination);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">Team attendance records</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label htmlFor="att-start" className="form-label">From</label>
            <input
              id="att-start"
              type="date"
              className="form-input"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
            />
          </div>
          <div>
            <label htmlFor="att-end" className="form-label">To</label>
            <input
              id="att-end"
              type="date"
              className="form-input"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
            />
          </div>
          <div>
            <label htmlFor="att-status" className="form-label">Status</label>
            <select
              id="att-status"
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All</option>
              <option value="ON_TIME">On Time</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="OVERTIME">Overtime</option>
              <option value="MISSING_LOG">Missing Log</option>
            </select>
          </div>
          <button onClick={loadAttendance} className="btn btn-primary">
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No attendance records found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Scheduled Start</th>
                    <th>Actual Start</th>
                    <th>Actual End</th>
                    <th>Late</th>
                    <th>OT</th>
                    <th>Break</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium">{record.user_name}</td>
                      <td>{record.attendance_date}</td>
                      <td>{record.shift_type_name || "—"}</td>
                      <td className="text-sm">
                        {record.scheduled_start_utc
                          ? new Date(record.scheduled_start_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="text-sm">
                        {record.actual_start_utc
                          ? new Date(record.actual_start_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="text-sm">
                        {record.actual_end_utc
                          ? new Date(record.actual_end_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td>
                        {record.late_minutes > 0 ? (
                          <span className="text-amber-600 font-medium">{record.late_minutes}m</span>
                        ) : "—"}
                      </td>
                      <td>
                        {record.overtime_minutes > 0 ? (
                          <span className="text-blue-600">{record.overtime_minutes}m</span>
                        ) : "—"}
                      </td>
                      <td>{record.total_break_minutes > 0 ? `${record.total_break_minutes}m` : "—"}</td>
                      <td><StatusBadge status={record.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Page {pagination.page} of {pagination.total_pages} ({pagination.total} records)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    className="btn btn-outline text-xs"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    className="btn btn-outline text-xs"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

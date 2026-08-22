"use client";

/**
 * Reports & Stakeholder Data Extraction Page.
 * Allows Admins & Managers to view operational KPIs and download CSV reports.
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { ApiError } from "@/lib/api";

export default function ReportsPage() {
  const [dates, setDates] = useState({
    start_date: "",
    end_date: "",
  });

  const [metrics, setMetrics] = useState({
    total_shifts: 0,
    total_late_shifts: 0,
    total_late_minutes: 0,
    total_overtime_minutes: 0,
  });

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getAttendanceReport({
        start_date: dates.start_date || undefined,
        end_date: dates.end_date || undefined,
      });
      setMetrics(res.data);
    } catch {
      setError("Failed to load report analytics");
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = async (endpoint: "attendance" | "tickets") => {
    setDownloading(endpoint);
    setError("");
    try {
      await api.exportReportCsv(endpoint, {
        start_date: dates.start_date || undefined,
        end_date: dates.end_date || undefined,
      });
    } catch (err) {
      setError((err as ApiError).message || "Failed to download report");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Operational reporting and CSV data extraction for stakeholders
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Date Range Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Select Date Range</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={dates.start_date}
              onChange={(e) => setDates({ ...dates, start_date: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={dates.end_date}
              onChange={(e) => setDates({ ...dates, end_date: e.target.value })}
            />
          </div>

          <button
            onClick={() => setDates({ start_date: "", end_date: "" })}
            className="btn btn-outline text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Shifts
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? "..." : metrics.total_shifts}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Late Shifts
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {loading ? "..." : metrics.total_late_shifts}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Late Minutes
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {loading ? "..." : `${metrics.total_late_minutes}m`}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Overtime Minutes
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? "..." : `${metrics.total_overtime_minutes}m`}
          </p>
        </div>
      </div>

      {/* CSV Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-3">
              📋
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Attendance & Punctuality Report
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Export employee clock-in/out timestamps, punctuality status, late minutes, overtime, and break durations to CSV.
            </p>
          </div>
          <button
            onClick={() => handleExportCsv("attendance")}
            disabled={downloading === "attendance"}
            className="btn btn-primary w-full"
          >
            {downloading === "attendance" ? "Generating CSV..." : "📥 Download Attendance CSV"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold mb-3">
              🎫
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Tickets & Workload Report
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Export tickets breakdown, priority levels (P1–P4), resolution timestamps, assigned agents, and environments to CSV.
            </p>
          </div>
          <button
            onClick={() => handleExportCsv("tickets")}
            disabled={downloading === "tickets"}
            className="btn btn-primary w-full"
          >
            {downloading === "tickets" ? "Generating CSV..." : "📥 Download Tickets CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

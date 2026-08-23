"use client";

/**
 * Reports & Activity Analytics Page.
 * Displays Daily, Weekly, and Monthly activity reports.
 * Accessible to Team Leads, AMS Managers, and Super Admins.
 */

import React, { useState, useEffect, useCallback } from "react";
import api, { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const OFFICIAL_DOMAINS = [
  "Supply chain and Planning Domain",
  "Store Ops, Sales",
  "Finance",
  "Integration and Middleware Domain",
  "Buy and Merchandise Domain",
];

interface ActivityLogItem {
  id: string;
  timestamp: string;
  user_name: string;
  user_email: string;
  domain: string;
  shift_type: string;
  activity_type: string;
  duration_minutes: number;
  ticket_number?: string;
  notes: string;
}

const MOCK_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: "act-101",
    timestamp: "2026-08-23 06:15",
    user_name: "Ernest Siega",
    user_email: "ernest.siega@ark.co.th",
    domain: "Supply chain and Planning Domain",
    shift_type: "Morning Shift",
    activity_type: "INCIDENT",
    duration_minutes: 45,
    ticket_number: "INC-9821",
    notes: "Investigated P1 DB memory spike on Supply Chain Gateway",
  },
  {
    id: "act-102",
    timestamp: "2026-08-23 07:30",
    user_name: "Maria Santos",
    user_email: "maria.santos@ark.co.th",
    domain: "Supply chain and Planning Domain",
    shift_type: "Morning Shift",
    activity_type: "SERVICE_REQUEST",
    duration_minutes: 30,
    ticket_number: "REQ-4402",
    notes: "Approved shift swap request and updated schedule permissions",
  },
  {
    id: "act-103",
    timestamp: "2026-08-23 08:10",
    user_name: "Somchai Prasert",
    user_email: "somchai.p@ark.co.th",
    domain: "Store Ops, Sales",
    shift_type: "Morning Shift",
    activity_type: "MONITORING",
    duration_minutes: 60,
    ticket_number: "MON-1102",
    notes: "POS Terminal connectivity check across Store Ops Bangna",
  },
  {
    id: "act-104",
    timestamp: "2026-08-23 09:00",
    user_name: "Ananya Rattana",
    user_email: "ananya.r@ark.co.th",
    domain: "Finance",
    shift_type: "Morning Shift",
    activity_type: "MAINTENANCE",
    duration_minutes: 90,
    ticket_number: "FIN-3301",
    notes: "Daily financial settlement queue reconciliation",
  },
  {
    id: "act-105",
    timestamp: "2026-08-23 10:15",
    user_name: "Karthik Subramanian",
    user_email: "karthik.s@ark.co.th",
    domain: "Integration and Middleware Domain",
    shift_type: "Morning Shift",
    activity_type: "DEPLOYMENT",
    duration_minutes: 40,
    ticket_number: "DEP-8812",
    notes: "Deployed API Gateway hotfix for Lotus's Middleware Hub",
  },
  {
    id: "act-106",
    timestamp: "2026-08-23 11:30",
    user_name: "Nattapong Kerdpokaphan",
    user_email: "nattapong.k@ark.co.th",
    domain: "Buy and Merchandise Domain",
    shift_type: "Morning Shift",
    activity_type: "INCIDENT",
    duration_minutes: 50,
    ticket_number: "INC-9940",
    notes: "Resolved catalog pricing sync lag in Commercial Division",
  },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState("");

  const userRole = user?.role || "";
  const canAccessReports = ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"].includes(userRole);

  const filterLogs = useCallback(() => {
    return MOCK_ACTIVITY_LOGS.filter((item) => {
      if (selectedDomain !== "ALL" && item.domain !== selectedDomain) {
        return false;
      }
      return true;
    });
  }, [selectedDomain]);

  const filteredLogs = filterLogs();

  // Metrics depending on frequency
  const metricsMap = {
    daily: {
      total_activities: filteredLogs.length,
      total_hours: 6.1,
      sla_compliance: "98.5%",
      incidents_resolved: 4,
      punctuality_rate: "96.2%",
    },
    weekly: {
      total_activities: filteredLogs.length * 5,
      total_hours: 42.5,
      sla_compliance: "97.8%",
      incidents_resolved: 22,
      punctuality_rate: "95.9%",
    },
    monthly: {
      total_activities: filteredLogs.length * 22,
      total_hours: 184.0,
      sla_compliance: "98.1%",
      incidents_resolved: 88,
      punctuality_rate: "96.8%",
    },
  };

  const currentMetrics = metricsMap[frequency];

  const handleDownloadCsv = async () => {
    setDownloading("csv");
    setDownloadSuccess("");

    try {
      // Build CSV headers and rows
      const headers = ["ID", "Timestamp", "Employee", "Email", "Domain", "Shift", "Activity Type", "Duration (Min)", "Ticket #", "Notes"];
      const rows = filteredLogs.map((log) => [
        log.id,
        log.timestamp,
        `"${log.user_name}"`,
        log.user_email,
        `"${log.domain}"`,
        `"${log.shift_type}"`,
        log.activity_type,
        log.duration_minutes,
        log.ticket_number || "N/A",
        `"${log.notes.replace(/"/g, '""')}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `AMS_${frequency.toUpperCase()}_Activity_Report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(`Successfully downloaded ${frequency} activity report (${filteredLogs.length} records).`);
    } catch {
      // Handle error
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdfSummary = () => {
    setDownloading("pdf");
    setDownloadSuccess("");

    setTimeout(() => {
      setDownloadSuccess(`Generated Executive PDF summary for ${frequency.toUpperCase()} report.`);
      setDownloading(null);
    }, 800);
  };

  if (!canAccessReports) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          🔒
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">
          Activity reporting and data download are restricted to Team Leads, AMS Managers, and Super Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational Activity Reporting System</h1>
          <p className="text-sm text-slate-500 mt-1">
            Daily, Weekly, and Monthly team activity logs, SLA metrics, and report downloads
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            disabled={downloading === "csv"}
            className="btn btn-primary shadow-sm flex items-center gap-2"
          >
            <span>📥</span>
            <span>{downloading === "csv" ? "Generating CSV..." : `Download ${frequency.toUpperCase()} CSV`}</span>
          </button>
          <button
            onClick={handleDownloadPdfSummary}
            disabled={downloading === "pdf"}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span>📄</span>
            <span>Executive PDF</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>✓</span>
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Controls: Frequency Tabs & Domain Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Frequency Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFrequency("daily")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              frequency === "daily" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📅 Daily Activity
          </button>
          <button
            type="button"
            onClick={() => setFrequency("weekly")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              frequency === "weekly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📊 Weekly Summary
          </button>
          <button
            type="button"
            onClick={() => setFrequency("monthly")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              frequency === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📈 Monthly Analytics
          </button>
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filter Domain:</span>
          <select
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            <option value="ALL">All Corporate Domains</option>
            {OFFICIAL_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Activities</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{currentMetrics.total_activities}</p>
          <p className="text-[11px] text-slate-400 mt-1">{frequency.toUpperCase()} log entries</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Logged Shift Hours</p>
          <p className="text-2xl font-black text-blue-600 mt-2">{currentMetrics.total_hours}h</p>
          <p className="text-[11px] text-slate-400 mt-1">Total active work hours</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">SLA Adherence</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{currentMetrics.sla_compliance}</p>
          <p className="text-[11px] text-slate-400 mt-1">On-time resolution rate</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Incidents Resolved</p>
          <p className="text-2xl font-black text-purple-600 mt-2">{currentMetrics.incidents_resolved}</p>
          <p className="text-[11px] text-slate-400 mt-1">P1–P4 tickets closed</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Shift Punctuality</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{currentMetrics.punctuality_rate}</p>
          <p className="text-[11px] text-slate-400 mt-1">On-time clock-in rate</p>
        </div>
      </div>

      {/* Detailed Activity Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📋</span> {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Activity Log Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing operational activities for {selectedDomain === "ALL" ? "All Corporate Domains" : selectedDomain}
            </p>
          </div>
          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
            {filteredLogs.length} Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Domain</th>
                <th className="py-3.5 px-4">Shift</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Ticket #</th>
                <th className="py-3.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {log.user_name}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {log.domain}
                  </td>
                  <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                    {log.shift_type}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      log.activity_type === "INCIDENT" ? "bg-red-100 text-red-700" :
                      log.activity_type === "DEPLOYMENT" ? "bg-purple-100 text-purple-700" :
                      log.activity_type === "MONITORING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {log.activity_type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-900 whitespace-nowrap">
                    {log.duration_minutes} min
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600 whitespace-nowrap">
                    {log.ticket_number || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                    {log.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Attendance & Team Shift Scheduling Page.
 * - AMS Head: Sees engineers on duty across all corporate domains.
 * - Team Leads: Can ONLY see engineers on duty in their assigned domain and schedule shifts for domain members.
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { AttendanceRecord, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SHIFT_OPTIONS = [
  { id: "st-1", name: "Shift 1", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00" },
  { id: "st-2", name: "Shift 2", time: "2:00 PM - 11:00 PM", hours: "14:00 - 23:00" },
  { id: "st-3", name: "Shift 3", time: "11:00 PM - 8:00 AM", hours: "23:00 - 08:00" },
  { id: "st-4", name: "Training", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00" },
];

const INITIAL_DUTY_ENGINEERS = [
  {
    id: "eng-101",
    name: "Ernest Siega",
    email: "ernest.siega@ark.co.th",
    role: "AMS_HEAD",
    domain: "Supply chain and Planning Domain",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    status: "WORKING",
    actual_start: "08:01 AM",
  },
  {
    id: "eng-102",
    name: "Maria Santos",
    email: "maria.santos@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Supply chain and Planning Domain",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    status: "WORKING",
    actual_start: "07:58 AM",
  },
  {
    id: "eng-103",
    name: "Somchai Prasert",
    email: "somchai.p@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Store Ops, Sales",
    shift_name: "Shift 2",
    shift_time: "2:00 PM - 11:00 PM",
    status: "ON_BREAK",
    actual_start: "02:00 PM",
  },
  {
    id: "eng-104",
    name: "Karthik Subramanian",
    email: "karthik.s@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Integration and Middleware Domain",
    shift_name: "Shift 3",
    shift_time: "11:00 PM - 8:00 AM",
    status: "WORKING",
    actual_start: "11:02 PM",
  },
  {
    id: "eng-105",
    name: "Ananya Rattana",
    email: "ananya.r@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Finance",
    shift_name: "Training",
    shift_time: "8:00 AM - 5:00 PM",
    status: "WORKING",
    actual_start: "08:00 AM",
  },
];

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    WORKING: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ON_TIME: "bg-emerald-100 text-emerald-700 border-emerald-200",
    LATE: "bg-amber-100 text-amber-700 border-amber-200",
    ON_BREAK: "bg-blue-100 text-blue-700 border-blue-200",
    ABSENT: "bg-red-100 text-red-700 border-red-200",
    OFF_DUTY: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${variants[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [dutyEngineers, setDutyEngineers] = useState(INITIAL_DUTY_ENGINEERS);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAmsHead = user?.role === "AMS_HEAD" || user?.role === "SUPER_ADMIN";
  const userDomain = (user as any)?.domain || "Supply chain and Planning Domain";
  const canSchedule = ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"].includes(user?.role || "");

  // Filter engineers on duty according to role domain scoping rules
  const visibleDutyEngineers = dutyEngineers.filter((eng) => {
    if (isAmsHead) return true;
    if (!eng.domain || !userDomain) return true;
    return eng.domain === userDomain || eng.domain.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]);
  });

  // Scheduling Form State
  const [scheduleForm, setScheduleForm] = useState({
    engineer_name: "Ernest Siega",
    engineer_email: "ernest.siega@ark.co.th",
    shift_id: SHIFT_OPTIONS[0].id,
    schedule_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const selectedShift = SHIFT_OPTIONS.find((s) => s.id === scheduleForm.shift_id) || SHIFT_OPTIONS[0];

    const updatedEngineer = {
      id: `eng-${Date.now()}`,
      name: scheduleForm.engineer_name,
      email: scheduleForm.engineer_email,
      role: "AMS_ENGINEER",
      domain: isAmsHead ? "Supply chain and Planning Domain" : userDomain,
      shift_name: selectedShift.name,
      shift_time: selectedShift.time,
      status: "WORKING",
      actual_start: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setDutyEngineers((prev) => [updatedEngineer, ...prev.filter((e) => e.email !== updatedEngineer.email)]);
    setSuccess(`Successfully scheduled ${scheduleForm.engineer_name} for ${selectedShift.name} (${selectedShift.time}).`);
    setShowScheduleModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance & Shift Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAmsHead ? "Global Attendance & Engineers on Duty (AMS Head Control)" : `Domain Attendance & Roster — ${userDomain}`}
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={() => { setShowScheduleModal(!showScheduleModal); setError(""); setSuccess(""); }}
            className="btn btn-primary shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <span>📅</span>
            <span>+ Set Team Shift Schedule</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* TOP SECTION: Engineers on Duty Right Now */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl shadow-xl p-6 text-white border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-wide">
                Engineers on Duty Right Now {isAmsHead ? "(All Domains)" : `(${userDomain})`}
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              {isAmsHead ? "Active engineers currently on shift across all corporate domains" : `Active engineers currently on shift in ${userDomain}`}
            </p>
          </div>

          {/* 4 Official Shifts Quick Reference Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-700/50 text-blue-200 font-semibold">
              Shift 1: 8AM-5PM
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-900/60 border border-purple-700/50 text-purple-200 font-semibold">
              Shift 2: 2PM-11PM
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-900/60 border border-amber-700/50 text-amber-200 font-semibold">
              Shift 3: 11PM-8AM
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 font-semibold">
              Training: 8AM-5PM
            </span>
          </div>
        </div>

        {/* On Duty Cards Grid */}
        {visibleDutyEngineers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 italic text-sm">
            No active engineers currently on duty in your domain ({userDomain}).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleDutyEngineers.map((eng) => (
              <div key={eng.id} className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                  {eng.name.split(" ").map(n => n[0]).join("")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className="text-xs font-bold text-white truncate">{eng.name}</p>
                    <StatusBadge status={eng.status} />
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">{eng.domain}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-blue-300">⏱️ {eng.shift_name} ({eng.shift_time})</span>
                    <span>Clocked in: {eng.actual_start}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Lead Scheduling Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h3 className="font-bold text-slate-900 text-base">Schedule Team Member Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Select Engineer / Team Member
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  value={scheduleForm.engineer_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const emailMap: Record<string, string> = {
                      "Ernest Siega": "ernest.siega@ark.co.th",
                      "Maria Santos": "maria.santos@ark.co.th",
                      "Alex Rivera": "alex.rivera@ark.co.th",
                      "Somchai Prasert": "somchai.p@ark.co.th",
                      "Ananya Rattana": "ananya.r@ark.co.th",
                      "Karthik Subramanian": "karthik.s@ark.co.th",
                      "Nattapong Kerdpokaphan": "nattapong.k@ark.co.th",
                    };
                    setScheduleForm({
                      ...scheduleForm,
                      engineer_name: name,
                      engineer_email: emailMap[name] || `${name.toLowerCase().replace(" ", ".")}@ark.co.th`,
                    });
                  }}
                >
                  {isAmsHead && <option value="Ernest Siega">Ernest Siega (AMS Head)</option>}
                  <option value="Maria Santos">Maria Santos (Team Lead - Supply Chain)</option>
                  <option value="Alex Rivera">Alex Rivera (Engineer)</option>
                  <option value="Somchai Prasert">Somchai Prasert (Team Lead - Store Ops)</option>
                  <option value="Ananya Rattana">Ananya Rattana (Team Lead - Finance)</option>
                  <option value="Karthik Subramanian">Karthik Subramanian (Team Lead - Integration)</option>
                  <option value="Nattapong Kerdpokaphan">Nattapong Kerdpokaphan (Team Lead - Merchandise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Select Shift Assignment (4 Official Shifts)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {SHIFT_OPTIONS.map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setScheduleForm({ ...scheduleForm, shift_id: shift.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        scheduleForm.shift_id === shift.id
                          ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">{shift.name}</p>
                      <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{shift.time}</p>
                      <p className="text-[10px] text-slate-400">{shift.hours}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Schedule Date
                </label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  value={scheduleForm.schedule_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  Save Shift Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Roster Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Full Shift Attendance Roster</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAmsHead ? "Viewing all attendance logs across all corporate domains" : `Viewing attendance logs for ${userDomain}`}
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            {visibleDutyEngineers.length} Active Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Engineer</th>
                <th className="py-3.5 px-4">Domain</th>
                <th className="py-3.5 px-4">Assigned Shift</th>
                <th className="py-3.5 px-4">Shift Hours</th>
                <th className="py-3.5 px-4">Clock-In Time</th>
                <th className="py-3.5 px-4">Duty Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleDutyEngineers.map((eng) => (
                <tr key={eng.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {eng.name}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {eng.domain}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-600 text-xs">
                    {eng.shift_name}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                    {eng.shift_time}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-900">
                    {eng.actual_start}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={eng.status} />
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

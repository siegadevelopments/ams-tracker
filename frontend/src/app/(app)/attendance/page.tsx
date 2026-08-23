"use client";

/**
 * Attendance & Team Shift Scheduling Page.
 * Features an Interactive Drag & Drop Shift Scheduler Roster for Team Leads and AMS Head!
 * - Team Leads / AMS Head: Drag and drop team members directly into the 4 official shift zones.
 * - Non-Leadership (Engineers/Agents): View personal previous attendance history, start/end shift times,
 *   duty status, and detailed remarks indicating whether on-time or late by X minutes/hours.
 */

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";

const SHIFT_OPTIONS = [
  { id: "st-1", name: "Shift 1", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00", bg: "from-blue-900/10 to-indigo-900/10 border-blue-200" },
  { id: "st-2", name: "Shift 2", time: "2:00 PM - 11:00 PM", hours: "14:00 - 23:00", bg: "from-purple-900/10 to-indigo-900/10 border-purple-200" },
  { id: "st-3", name: "Shift 3", time: "11:00 PM - 8:00 AM", hours: "23:00 - 08:00", bg: "from-amber-900/10 to-orange-900/10 border-amber-200" },
  { id: "st-4", name: "Training", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00", bg: "from-emerald-900/10 to-teal-900/10 border-emerald-200" },
];

interface DraggableTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  domain: string;
  shift_id: string | null; // null = pool/unassigned
  actual_start?: string;
  status: string;
}

const INITIAL_TEAM_MEMBERS: DraggableTeamMember[] = [
  {
    id: "eng-101",
    name: "Ernest Siega",
    email: "ernest.siega@ark.co.th",
    role: "AMS_HEAD",
    domain: "Supply chain and Planning Domain",
    shift_id: "st-1",
    status: "WORKING",
    actual_start: "08:01 AM",
  },
  {
    id: "eng-102",
    name: "Maria Santos",
    email: "maria.santos@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Supply chain and Planning Domain",
    shift_id: "st-1",
    status: "WORKING",
    actual_start: "07:58 AM",
  },
  {
    id: "eng-103",
    name: "Somchai Prasert",
    email: "somchai.p@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Store Ops, Sales",
    shift_id: "st-2",
    status: "ON_BREAK",
    actual_start: "02:00 PM",
  },
  {
    id: "eng-104",
    name: "Karthik Subramanian",
    email: "karthik.s@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Integration and Middleware Domain",
    shift_id: "st-3",
    status: "WORKING",
    actual_start: "11:02 PM",
  },
  {
    id: "eng-105",
    name: "Ananya Rattana",
    email: "ananya.r@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Finance",
    shift_id: "st-4",
    status: "WORKING",
    actual_start: "08:00 AM",
  },
  {
    id: "eng-106",
    name: "Alex Rivera",
    email: "alex.rivera@ark.co.th",
    role: "AMS_ENGINEER",
    domain: "Supply chain and Planning Domain",
    shift_id: null,
    status: "OFF_DUTY",
  },
  {
    id: "eng-107",
    name: "Nattapong Kerdpokaphan",
    email: "nattapong.k@ark.co.th",
    role: "TEAM_LEAD",
    domain: "Buy and Merchandise Domain",
    shift_id: null,
    status: "OFF_DUTY",
  },
];

interface PersonalAttendanceHistory {
  id: string;
  date: string;
  shift_name: string;
  shift_time: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  late_minutes: number;
  overtime_minutes: number;
  status: "ON_TIME" | "LATE" | "OVERTIME" | "COMPLETED";
}

const MOCK_PERSONAL_ATTENDANCE_HISTORY: PersonalAttendanceHistory[] = [
  {
    id: "att-hist-01",
    date: "Aug 23, 2026 (Sun)",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    scheduled_start: "08:00 AM",
    scheduled_end: "05:00 PM",
    actual_start: "08:01 AM",
    actual_end: "05:00 PM",
    late_minutes: 0,
    overtime_minutes: 0,
    status: "ON_TIME",
  },
  {
    id: "att-hist-02",
    date: "Aug 22, 2026 (Sat)",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    scheduled_start: "08:00 AM",
    scheduled_end: "05:00 PM",
    actual_start: "08:14 AM",
    actual_end: "05:00 PM",
    late_minutes: 14,
    overtime_minutes: 0,
    status: "LATE",
  },
  {
    id: "att-hist-03",
    date: "Aug 21, 2026 (Fri)",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    scheduled_start: "08:00 AM",
    scheduled_end: "05:00 PM",
    actual_start: "07:58 AM",
    actual_end: "05:30 PM",
    late_minutes: 0,
    overtime_minutes: 30,
    status: "OVERTIME",
  },
  {
    id: "att-hist-04",
    date: "Aug 20, 2026 (Thu)",
    shift_name: "Shift 2",
    shift_time: "2:00 PM - 11:00 PM",
    scheduled_start: "02:00 PM",
    scheduled_end: "11:00 PM",
    actual_start: "03:15 PM",
    actual_end: "11:00 PM",
    late_minutes: 75,
    overtime_minutes: 0,
    status: "LATE",
  },
  {
    id: "att-hist-05",
    date: "Aug 19, 2026 (Wed)",
    shift_name: "Shift 1",
    shift_time: "8:00 AM - 5:00 PM",
    scheduled_start: "08:00 AM",
    scheduled_end: "05:00 PM",
    actual_start: "08:00 AM",
    actual_end: "05:00 PM",
    late_minutes: 0,
    overtime_minutes: 0,
    status: "ON_TIME",
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
    OVERTIME: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${variants[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PunctualityRemark({ lateMinutes, overtimeMinutes }: { lateMinutes: number; overtimeMinutes?: number }) {
  if (lateMinutes === 0 && (!overtimeMinutes || overtimeMinutes === 0)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
        <span>✓</span> On Time (0m delay)
      </span>
    );
  }

  if (lateMinutes > 0) {
    const hours = Math.floor(lateMinutes / 60);
    const mins = lateMinutes % 60;
    let timeText = "";
    if (hours > 0) {
      timeText = `${hours} hour${hours > 1 ? "s" : ""}${mins > 0 ? ` ${mins} mins` : ""}`;
    } else {
      timeText = `${mins} minutes`;
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
        <span>⚠️</span> Late by {timeText}
      </span>
    );
  }

  if (overtimeMinutes && overtimeMinutes > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
        <span>➕</span> Overtime: {overtimeMinutes}m
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
      <span>✓</span> On Time
    </span>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<DraggableTeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState<"dragdrop" | "table">("dragdrop");

  const userRole = user?.role || "";
  const isLeadership = ["AMS_HEAD", "SUPER_ADMIN", "TEAM_LEAD", "AMS_MANAGER"].includes(userRole);
  const isAmsHead = userRole === "AMS_HEAD" || userRole === "SUPER_ADMIN";
  const userDomain = (user as any)?.domain || "Supply chain and Planning Domain";

  // Filter members according to domain scoping rules
  const scopedMembers = teamMembers.filter((m) => {
    if (isAmsHead) return true;
    if (!m.domain || !userDomain) return true;
    return m.domain === userDomain || m.domain.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]);
  });

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData("text/plain", memberId);
    setDraggedMemberId(memberId);
  };

  const handleDragOver = (e: React.DragEvent, shiftId: string | null) => {
    e.preventDefault();
    setDragOverShiftId(shiftId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverShiftId(null);
  };

  const handleDrop = (e: React.DragEvent, targetShiftId: string | null) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("text/plain") || draggedMemberId;
    setDragOverShiftId(null);
    setDraggedMemberId(null);

    if (!memberId) return;

    const targetShift = SHIFT_OPTIONS.find((s) => s.id === targetShiftId);
    const member = teamMembers.find((m) => m.id === memberId);

    if (member) {
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, shift_id: targetShiftId } : m))
      );

      if (targetShift) {
        setSuccess(`✓ Drag & Drop: Plotted ${member.name} to ${targetShift.name} (${targetShift.time}).`);
      } else {
        setSuccess(`✓ Moved ${member.name} back to Unassigned Pool.`);
      }

      setTimeout(() => setSuccess(""), 4000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isLeadership ? "Drag & Drop Shift Attendance Scheduler" : "My Attendance & Clock-In History"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLeadership
              ? (isAmsHead ? "Drag team members directly into shift zones across all domains" : `Drag & drop team members into shift schedules for ${userDomain}`)
              : `Personal shift start/end timestamps, duty status, and punctuality remarks for ${user?.first_name || "Engineer"}`}
          </p>
        </div>

        {isLeadership && (
          <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("dragdrop")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "dragdrop" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
              }`}
            >
              🖱️ Drag & Drop Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "table" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
              }`}
            >
              📋 Roster Table View
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* VIEW FOR NON-LEADERSHIP (REGULAR ENGINEERS / AGENTS) */}
      {!isLeadership ? (
        <div className="space-y-6">
          {/* Performance KPI Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Shifts Logged</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{MOCK_PERSONAL_ATTENDANCE_HISTORY.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">August 2026 shifts</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">On-Time Clock-Ins</p>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {MOCK_PERSONAL_ATTENDANCE_HISTORY.filter(h => h.late_minutes === 0).length} / {MOCK_PERSONAL_ATTENDANCE_HISTORY.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">80.0% punctuality rate</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Late Clock-Ins</p>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {MOCK_PERSONAL_ATTENDANCE_HISTORY.filter(h => h.late_minutes > 0).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">2 shifts with late remarks</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Late Time</p>
              <p className="text-2xl font-black text-amber-600 mt-2">1h 29m</p>
              <p className="text-[11px] text-slate-400 mt-1">Across August 2026</p>
            </div>
          </div>

          {/* Detailed Attendance History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>📋</span> Previous Shift Schedules & Clock-In Performance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed start/end times, duty status, and punctuality remarks
                </p>
              </div>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                {MOCK_PERSONAL_ATTENDANCE_HISTORY.length} Shift Logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Assigned Shift</th>
                    <th className="py-3.5 px-4">Scheduled Hours</th>
                    <th className="py-3.5 px-4">Actual Start</th>
                    <th className="py-3.5 px-4">Actual End</th>
                    <th className="py-3.5 px-4">Duty Status</th>
                    <th className="py-3.5 px-4">Punctuality Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_PERSONAL_ATTENDANCE_HISTORY.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-blue-600 whitespace-nowrap">
                        {item.shift_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {item.scheduled_start} - {item.scheduled_end}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.actual_start}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.actual_end}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PunctualityRemark lateMinutes={item.late_minutes} overtimeMinutes={item.overtime_minutes} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* LEADERSHIP VIEW WITH INTERACTIVE DRAG & DROP SCHEDULER */
        <div className="space-y-8">
          {viewMode === "dragdrop" ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* LEFT COLUMN: UNASSIGNED / AVAILABLE TEAM MEMBERS POOL */}
              <div
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                  dragOverShiftId === null && draggedMemberId ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-400/20" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>👥</span> Team Members Pool
                    </h2>
                    <p className="text-[11px] text-slate-500">Drag a member to schedule</p>
                  </div>
                  <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {scopedMembers.filter((m) => m.shift_id === null).length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {scopedMembers.filter((m) => m.shift_id === null).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                      All team members are scheduled to shift zones!
                    </div>
                  ) : (
                    scopedMembers
                      .filter((m) => m.shift_id === null)
                      .map((member) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, member.id)}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {member.name}
                            </p>
                            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                              {member.role.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{member.domain}</p>
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <span>🖐️</span> Drag to assign shift
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: 4 OFFICIAL SHIFT DROP ZONES */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {SHIFT_OPTIONS.map((shift) => {
                  const assignedMembers = scopedMembers.filter((m) => m.shift_id === shift.id);
                  const isHovered = dragOverShiftId === shift.id;

                  return (
                    <div
                      key={shift.id}
                      onDragOver={(e) => handleDragOver(e, shift.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, shift.id)}
                      className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                        isHovered
                          ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/30 scale-[1.01]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Shift Zone Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm">{shift.name}</h3>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              {shift.time}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{shift.hours}</p>
                        </div>

                        <span className="text-xs font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                          {assignedMembers.length} Engineers
                        </span>
                      </div>

                      {/* Drop Zone Member Cards */}
                      <div className="space-y-2.5 min-h-[160px] p-2 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
                        {assignedMembers.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs italic">
                            🎯 Drag & Drop team members here to schedule for {shift.name}
                          </div>
                        ) : (
                          assignedMembers.map((member) => (
                            <div
                              key={member.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, member.id)}
                              className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                  <StatusBadge status={member.status} />
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{member.domain}</p>
                              </div>

                              <button
                                type="button"
                                title="Remove from shift"
                                onClick={() => {
                                  setTeamMembers((prev) =>
                                    prev.map((m) => (m.id === member.id ? { ...m, shift_id: null } : m))
                                  );
                                  setSuccess(`✓ Removed ${member.name} from ${shift.name}.`);
                                  setTimeout(() => setSuccess(""), 3000);
                                }}
                                className="text-slate-400 hover:text-red-500 text-xs font-bold p-1 rounded-md hover:bg-red-50 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* TABLE VIEW FOR LEADERSHIP */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Full Shift Attendance Roster Table</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAmsHead ? "Viewing all attendance logs across all corporate domains" : `Viewing attendance logs for ${userDomain}`}
                  </p>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                  {scopedMembers.length} Active Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Engineer</th>
                      <th className="py-3.5 px-4">Domain</th>
                      <th className="py-3.5 px-4">Assigned Shift</th>
                      <th className="py-3.5 px-4">Clock-In Time</th>
                      <th className="py-3.5 px-4">Duty Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedMembers.map((eng) => {
                      const shift = SHIFT_OPTIONS.find((s) => s.id === eng.shift_id);
                      return (
                        <tr key={eng.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{eng.name}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{eng.domain}</td>
                          <td className="py-3.5 px-4 font-bold text-blue-600 text-xs">
                            {shift ? `${shift.name} (${shift.time})` : "Unassigned"}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-900">
                            {eng.actual_start || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={eng.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

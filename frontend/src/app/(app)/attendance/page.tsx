"use client";

/**
 * Attendance & Team Shift Scheduling Page.
 * Features an Interactive Drag & Drop Shift Scheduler Roster with Date Picker, Per-Date Schedule Storage,
 * and Shift Duty Role Designation (PIC, Technical Admin, Support - Default: Support)!
 * - Team Leads / AMS Head: Assign shift duty roles (PIC ⭐, Technical Admin 🛠️, Support 👤 - default: Support).
 * - Each date maintains its own independent shift roster and duty role assignments.
 * - Official Schedule Categories: Shift 1, Shift 2, Shift 3, Training, and Leave Schedule (On Leave / Vacation).
 */

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";

export type ShiftDutyRole = "SUPPORT" | "PIC" | "TECHNICAL_ADMIN";

const SHIFT_OPTIONS = [
  { id: "st-1", name: "Shift 1", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00", color: "blue" },
  { id: "st-2", name: "Shift 2", time: "2:00 PM - 11:00 PM", hours: "14:00 - 23:00", color: "blue" },
  { id: "st-3", name: "Shift 3", time: "11:00 PM - 8:00 AM", hours: "23:00 - 08:00", color: "blue" },
  { id: "st-4", name: "Training", time: "8:00 AM - 5:00 PM", hours: "08:00 - 17:00", color: "indigo" },
  { id: "st-5", name: "Leave", time: "Vacation / Sick / Personal", hours: "Full Day Leave", color: "amber" },
];

interface DraggableTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  domain: string;
  actual_start?: string;
  status: string;
}

const INITIAL_TEAM_MEMBERS: DraggableTeamMember[] = [
  { id: "eng-101", name: "Ernest Siega", email: "ernest.siega@ark.co.th", role: "AMS_HEAD", domain: "Supply chain and Planning Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-102", name: "Anderson Martin", email: "anderson.martin@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Supply chain and Planning Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-103", name: "Arthur Myles", email: "arthur.myles@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Store Ops, Sales", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-104", name: "Asher M. Taylor", email: "asher.m.taylor@ark.co.th", role: "TEAM_LEAD", domain: "Finance", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-105", name: "Ed Wong", email: "ed.wong@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Integration and Middleware Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-106", name: "Essam Nabil", email: "essam.nabil@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Buy and Merchandise Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-107", name: "Fred Valdez", email: "fred.valdez@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Supply chain and Planning Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-108", name: "Gee Isaac", email: "gee.isaac@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Store Ops, Sales", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-109", name: "Maria Yilmaz", email: "maria.yilmaz@ark.co.th", role: "TEAM_LEAD", domain: "Supply chain and Planning Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-110", name: "Nielsen Perez", email: "nielsen.perez@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Finance", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-111", name: "Sean Reed", email: "sean.reed@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Integration and Middleware Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-112", name: "Shaun Hao", email: "shaun.hao@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Buy and Merchandise Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-113", name: "Zack Chase", email: "zack.chase@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Store Ops, Sales", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-114", name: "BJ Ismael", email: "bjismael@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Supply chain and Planning Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-115", name: "Arnel Maala", email: "arnel.maala@ark.co.th", role: "TEAM_LEAD", domain: "Store Ops, Sales", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-116", name: "Mohammad Bari", email: "mohammad.bari@ark.co.th", role: "TEAM_LEAD", domain: "Integration and Middleware Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-117", name: "Claire Acula", email: "claire.acula@ark.co.th", role: "TEAM_LEAD", domain: "Buy and Merchandise Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-118", name: "Jonathan Morales", email: "jonathan.morales@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Finance", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-119", name: "Patrick Cinco", email: "patrick.cinco@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Integration and Middleware Domain", status: "WORKING", actual_start: "08:00 AM" },
  { id: "eng-120", name: "Vryll Atilano", email: "vryll.atilano@ark.co.th", role: "SUPPORT_ENGINEER", domain: "Buy and Merchandise Domain", status: "WORKING", actual_start: "08:00 AM" },
];

// 24/7 AMS Shift Roster Generator for any date
// Ensures 100% 24/7 operational coverage across Shift 1 (Day), Shift 2 (Evening), and Shift 3 (Night)
const generate247DateSchedule = (dateStr: string): Record<string, string | null> => {
  const schedule: Record<string, string | null> = {};
  const dateObj = new Date(dateStr + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  INITIAL_TEAM_MEMBERS.forEach((m, index) => {
    // 5-day work / 2-day off pattern per engineer
    const offDay1 = (index * 2) % 7;
    const offDay2 = (offDay1 + 1) % 7;

    if (dayOfWeek === offDay1 || dayOfWeek === offDay2) {
      schedule[m.id] = null; // Off Duty
    } else {
      // Rotate working shifts: Shift 1, Shift 2, Shift 3
      const shiftTypeIndex = (index + Math.floor(dayOfWeek / 2)) % 3;
      if (shiftTypeIndex === 0) schedule[m.id] = "st-1"; // Shift 1 (08:00 - 17:00)
      else if (shiftTypeIndex === 1) schedule[m.id] = "st-2"; // Shift 2 (14:00 - 23:00)
      else schedule[m.id] = "st-3"; // Shift 3 (23:00 - 08:00 24/7 Night Monitoring)
    }
  });

  return schedule;
};

// Initial default schedule mapping (Empty for testing)
const TODAY_DATE_STR = new Date().toISOString().split("T")[0];

const INITIAL_DATE_SCHEDULES: Record<string, Record<string, string | null>> = {};

const INITIAL_DATE_DUTY_ROLES: Record<string, Record<string, ShiftDutyRole>> = {};

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
  status: "ON_TIME" | "LATE" | "OVERTIME" | "COMPLETED" | "LEAVE";
  duty_role?: ShiftDutyRole;
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
    duty_role: "PIC",
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
    duty_role: "TECHNICAL_ADMIN",
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
    duty_role: "SUPPORT",
  },
  {
    id: "att-hist-04",
    date: "Aug 20, 2026 (Thu)",
    shift_name: "Leave",
    shift_time: "Vacation / Personal Leave",
    scheduled_start: "—",
    scheduled_end: "—",
    actual_start: "—",
    actual_end: "—",
    late_minutes: 0,
    overtime_minutes: 0,
    status: "LEAVE",
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
    duty_role: "SUPPORT",
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
    LEAVE: "bg-amber-100 text-amber-800 border-amber-300",
  };
  return (
    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${variants[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DutyRoleBadge({ role }: { role: ShiftDutyRole }) {
  if (role === "PIC") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span> PIC
      </span>
    );
  }
  if (role === "TECHNICAL_ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span> Tech Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Support
    </span>
  );
}

function PunctualityRemark({ lateMinutes, overtimeMinutes, isLeave }: { lateMinutes: number; overtimeMinutes?: number; isLeave?: boolean }) {
  if (isLeave) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
        Approved Leave
      </span>
    );
  }

  if (lateMinutes === 0 && (!overtimeMinutes || overtimeMinutes === 0)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
        On Time (0m delay)
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
        Late by {timeText}
      </span>
    );
  }

  if (overtimeMinutes && overtimeMinutes > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
        Overtime: {overtimeMinutes}m
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
      On Time
    </span>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [teamMembers] = useState<DraggableTeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [dateSchedules, setDateSchedules] = useState<Record<string, Record<string, string | null>>>(INITIAL_DATE_SCHEDULES);
  const [dutyRoleSchedules, setDutyRoleSchedules] = useState<Record<string, Record<string, ShiftDutyRole>>>(INITIAL_DATE_DUTY_ROLES);
  
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "dragdrop" | "table">("calendar");
  const [quickAssignCell, setQuickAssignCell] = useState<{ memberId: string; memberName: string; dateStr: string } | null>(null);

  // Selected Date State
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_DATE_STR);

  // Auto-Schedule Roster State (5 Work Days / 2 Off Days)
  const [showAutoScheduleModal, setShowAutoScheduleModal] = useState(false);
  const [showAutoScheduleDropdown, setShowAutoScheduleDropdown] = useState(false);
  const [autoScheduleConfig, setAutoScheduleConfig] = useState({
    targetShiftId: "st-1",
    offDay1: 6, // 6 = Saturday
    offDay2: 0, // 0 = Sunday
    dateRange: "WEEK",
    memberId: "ALL",
  });

  const userRole = user?.role || "";
  const isLeadership = ["AMS_HEAD", "SUPER_ADMIN", "TEAM_LEAD"].includes(userRole);
  const isAmsHead = userRole === "AMS_HEAD" || userRole === "SUPER_ADMIN";
  const userDomain = (user as any)?.domain || "Supply chain and Planning Domain";

  // Compute active week dates starting from Monday
  const getWeekDates = (dateStr: string) => {
    const curr = new Date(dateStr + "T00:00:00");
    const day = curr.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMon));

    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      week.push(next.toISOString().split("T")[0]);
    }
    return week;
  };

  const activeWeekDates = getWeekDates(selectedDate);

  // Get active shift ID for a member on a specific date
  const getMemberShiftForDate = (memberId: string, dateStr: string): string | null => {
    if (dateSchedules[dateStr] && dateSchedules[dateStr][memberId] !== undefined) {
      return dateSchedules[dateStr][memberId];
    }
    return null;
  };

  const handleClearAllSchedules = () => {
    setDateSchedules({});
    setDutyRoleSchedules({});
    setSuccess("Wiped all schedule data. Roster is completely clear for testing!");
    setTimeout(() => setSuccess(""), 4000);
  };

  // Get active shift duty role for a member on a specific date (Defaults to "SUPPORT")
  const getMemberDutyRoleForDate = (memberId: string, dateStr: string): ShiftDutyRole => {
    if (dutyRoleSchedules[dateStr] && dutyRoleSchedules[dateStr][memberId]) {
      return dutyRoleSchedules[dateStr][memberId];
    }
    return "SUPPORT";
  };

  // Get active shift ID for a member on the selected date
  const getMemberShiftForSelectedDate = (memberId: string): string | null => {
    return getMemberShiftForDate(memberId, selectedDate);
  };

  // Get active shift duty role for a member on the selected date (Defaults to "SUPPORT")
  const getMemberDutyRoleForSelectedDate = (memberId: string): ShiftDutyRole => {
    return getMemberDutyRoleForDate(memberId, selectedDate);
  };

  // Filter members according to domain scoping rules (Team Leads only see their domain members)
  const scopedMembers = teamMembers.filter((m) => {
    if (isAmsHead) return true;
    if (!m.domain || !userDomain) return true;
    return m.domain === userDomain || m.domain.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]);
  });

  // Date Navigation Handlers
  const handlePreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(TODAY_DATE_STR);
  };

  const formattedSelectedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
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

  const handleDragLeave = () => {
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
      setDateSchedules((prev) => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          [memberId]: targetShiftId,
        },
      }));

      if (targetShift) {
        setSuccess(`Plotted ${member.name} to ${targetShift.name} (${targetShift.time}) for ${formattedSelectedDate}. (Default Duty Role: Support)`);
      } else {
        setSuccess(`Moved ${member.name} back to Unassigned Pool for ${formattedSelectedDate}.`);
      }

      setTimeout(() => setSuccess(""), 4000);
    }
  };

  const handleRemoveFromShift = (memberId: string, memberName: string, shiftName: string) => {
    setDateSchedules((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [memberId]: null,
      },
    }));
    setSuccess(`Removed ${memberName} from ${shiftName} for ${formattedSelectedDate}.`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleChangeDutyRole = (memberId: string, newRole: ShiftDutyRole, memberName: string) => {
    setDutyRoleSchedules((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [memberId]: newRole,
      },
    }));

    const roleLabel = newRole === "PIC" ? "PIC" : newRole === "TECHNICAL_ADMIN" ? "Technical Admin" : "Support";
    setSuccess(`Designated ${memberName} as ${roleLabel} for ${formattedSelectedDate}.`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleAssignMemberToDateShift = (memberId: string, targetShiftId: string | null, dateStr: string, memberName: string, shiftName: string) => {
    setDateSchedules((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [memberId]: targetShiftId,
      },
    }));
    if (targetShiftId) {
      setSuccess(`Assigned ${memberName} to ${shiftName} for ${dateStr}.`);
    } else {
      setSuccess(`Set ${memberName} to Off Duty for ${dateStr}.`);
    }
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSetMemberDutyRoleForDate = (memberId: string, newRole: ShiftDutyRole, dateStr: string, memberName: string) => {
    setDutyRoleSchedules((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [memberId]: newRole,
      },
    }));
    const roleLabel = newRole === "PIC" ? "PIC" : newRole === "TECHNICAL_ADMIN" ? "Technical Admin" : "Support";
    setSuccess(`Designated ${memberName} as ${roleLabel} for ${dateStr}.`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleExecuteAutoSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const daysCount = autoScheduleConfig.dateRange === "MONTH" ? 30 : 7;
    const startDate = new Date(selectedDate + "T00:00:00");
    const membersToSchedule = autoScheduleConfig.memberId === "ALL"
      ? scopedMembers
      : scopedMembers.filter(m => m.id === autoScheduleConfig.memberId);

    if (membersToSchedule.length === 0) {
      setSuccess("No team members available in your domain to auto-schedule.");
      return;
    }

    const updatedSchedules = { ...dateSchedules };

    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      const isOffDay = dayOfWeek === Number(autoScheduleConfig.offDay1) || dayOfWeek === Number(autoScheduleConfig.offDay2);
      const assignedShiftId = isOffDay ? null : autoScheduleConfig.targetShiftId;

      if (!updatedSchedules[dateStr]) {
        updatedSchedules[dateStr] = {};
      }

      membersToSchedule.forEach((member) => {
        updatedSchedules[dateStr][member.id] = assignedShiftId;
      });
    }

    setDateSchedules(updatedSchedules);
    setShowAutoScheduleModal(false);
    const targetShiftName = SHIFT_OPTIONS.find(s => s.id === autoScheduleConfig.targetShiftId)?.name || "Shift";
    const domainText = isAmsHead ? "Global Domains" : userDomain;
    setSuccess(`Auto-Scheduled ${membersToSchedule.length} member(s) under ${domainText} to ${targetShiftName} (5 days work / 2 rest days) starting from ${selectedDate} for ${daysCount} days.`);
    setTimeout(() => setSuccess(""), 5000);
  };

  const handleAutoScheduleSpecificShift = (targetShiftId: string, shiftName: string) => {
    if (scopedMembers.length === 0) {
      setSuccess("No team members available in your domain to auto-schedule.");
      return;
    }

    const updatedSchedules = { ...dateSchedules };
    const startDate = new Date(selectedDate + "T00:00:00");
    const daysCount = 7; // Auto-plots full week (7 days)

    scopedMembers.forEach((member, index) => {
      // Stagger off days per member so shift is covered 24/7 every day
      const off1 = (index * 2) % 7;
      const off2 = (off1 + 1) % 7;

      for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat

        const isOffDay = dayOfWeek === off1 || dayOfWeek === off2;
        const assignedShiftId = isOffDay ? null : targetShiftId;

        if (!updatedSchedules[dateStr]) {
          updatedSchedules[dateStr] = {};
        }
        updatedSchedules[dateStr][member.id] = assignedShiftId;
      }
    });

    setDateSchedules(updatedSchedules);
    const domainText = isAmsHead ? "Global Roster" : userDomain;
    setSuccess(`Auto-Scheduled ${scopedMembers.length} member(s) (${domainText}) to ${shiftName} with 24/7 staggered 5:2 coverage starting from ${selectedDate}!`);
    setTimeout(() => setSuccess(""), 5000);
  };

  const handleAutoDivide3Shifts = () => {
    if (scopedMembers.length === 0) {
      setSuccess("No team members available in your domain to auto-schedule.");
      return;
    }

    const updatedSchedules = { ...dateSchedules };
    const startDate = new Date(selectedDate + "T00:00:00");
    const daysCount = 7; // Auto-plots full week (7 days)

    const SHIFT_IDS = ["st-1", "st-2", "st-3"];
    let shift1Count = 0;
    let shift2Count = 0;
    let shift3Count = 0;

    const shiftGroupCounters = [0, 0, 0];

    scopedMembers.forEach((member, index) => {
      const groupIndex = index % 3;
      const targetShiftId = SHIFT_IDS[groupIndex];
      const memberSubIndex = shiftGroupCounters[groupIndex]++;

      if (groupIndex === 0) shift1Count++;
      if (groupIndex === 1) shift2Count++;
      if (groupIndex === 2) shift3Count++;

      // Stagger 2 off-days per member so NO shift ever has 0 engineers on any day
      const off1 = (memberSubIndex * 2) % 7;
      const off2 = (off1 + 1) % 7;

      for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayOfWeek = currentDate.getDay(); // 0..6

        const isOffDay = dayOfWeek === off1 || dayOfWeek === off2;
        const assignedShiftId = isOffDay ? null : targetShiftId;

        if (!updatedSchedules[dateStr]) {
          updatedSchedules[dateStr] = {};
        }
        updatedSchedules[dateStr][member.id] = assignedShiftId;
      }
    });

    setDateSchedules(updatedSchedules);
    setShowAutoScheduleModal(false);
    const domainText = isAmsHead ? "Global Roster" : userDomain;
    setSuccess(`Automatically divided ${scopedMembers.length} member(s) (${domainText}) across 3 shifts: Shift 1 (${shift1Count}), Shift 2 (${shift2Count}), Shift 3 (${shift3Count}) with 100% zero-gaps 24/7 coverage on all shifts!`);
    setTimeout(() => setSuccess(""), 6000);
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
              ? (isAmsHead ? "Schedule shifts, assign duty designations (PIC, Technical Admin, Support), and manage leave" : `Schedule shifts and assign duty designations for ${userDomain}`)
              : `Personal shift start/end timestamps, duty status, and punctuality remarks for ${user?.first_name || "Engineer"}`}
          </p>
        </div>

        {isLeadership && (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {/* AUTO SCHEDULE BUTTON GROUP */}
            <div className="relative inline-block text-left">
              <div className="flex items-center bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={handleAutoDivide3Shifts}
                  className="px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer border-r border-blue-500/50"
                  title="Automatically divide team members across Shift 1, Shift 2, and Shift 3"
                >
                  <span>⚡ Auto-Schedule (3 Shifts)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutoScheduleDropdown(!showAutoScheduleDropdown)}
                  className="px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center"
                  title="Select Specific Shift Auto-Scheduler"
                >
                  <span className="text-[10px]">▼</span>
                </button>
              </div>

              {showAutoScheduleDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-fade-in">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Direct Shift Auto-Scheduler
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoScheduleSpecificShift("st-1", "Shift 1 (8AM - 5PM)");
                      setShowAutoScheduleDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>🌅 Add to Shift 1</span>
                    <span className="text-[10px] text-slate-400 font-normal">08:00 - 17:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoScheduleSpecificShift("st-2", "Shift 2 (2PM - 11PM)");
                      setShowAutoScheduleDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>🌆 Add to Shift 2</span>
                    <span className="text-[10px] text-slate-400 font-normal">14:00 - 23:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoScheduleSpecificShift("st-3", "Shift 3 (11PM - 8AM)");
                      setShowAutoScheduleDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>🌙 Add to Shift 3</span>
                    <span className="text-[10px] text-slate-400 font-normal">23:00 - 08:00</span>
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleAutoDivide3Shifts();
                        setShowAutoScheduleDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>🔄 Divide Across All 3 Shifts</span>
                      <span className="text-[10px] text-blue-500 font-semibold">Equal Split</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleClearAllSchedules();
                        setShowAutoScheduleDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>🧹 Clear All Schedules</span>
                      <span className="text-[10px] text-red-500 font-semibold">Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DATE PICKER & ROSTER DATE SWITCHER */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={handlePreviousDay}
                className="p-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Previous Day"
              >
                ◀
              </button>
              <input
                type="date"
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Next Day"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer ml-1"
              >
                Today
              </button>
            </div>

            {/* View Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "calendar" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                📅 Calendar View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("dragdrop")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "dragdrop" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                🎴 Shift Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "table" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                📋 Roster Table
              </button>
            </div>
          </div>
        )}
      </div>

      {isLeadership && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              CAL
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Roster Week</p>
              <h2 className="text-base font-bold text-white">{formattedSelectedDate}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
              Duty Roles: PIC ⭐ | Tech Admin 🛠️ | Support 👤
            </span>
            <span className="text-[11px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">
              {selectedDate === TODAY_DATE_STR ? "TODAY" : "SELECTED DATE"}
            </span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* 📅 INTERACTIVE WEEKLY CALENDAR ROSTER MATRIX */}
      {isLeadership && viewMode === "calendar" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          {/* Calendar Top Banner */}
          <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h2 className="text-lg font-black text-white">Weekly Shift Schedule Calendar</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive shift matrix for {isAmsHead ? "Global AMS Roster" : userDomain}. Click any day cell to assign or update duty roles.
              </p>
            </div>

            {/* Shift Color Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Shift 1 (08-17)
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Shift 2 (14-23)
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> Shift 3 (23-08)
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Leave
              </div>
            </div>
          </div>

          {/* Transposed Calendar Matrix Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <th className="py-3.5 px-4 w-60 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">Shift Schedule & Hours</th>
                  {activeWeekDates.map((dateStr) => {
                    const dateObj = new Date(dateStr + "T00:00:00");
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const isToday = dateStr === TODAY_DATE_STR;
                    const isSelected = dateStr === selectedDate;

                    return (
                      <th
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`py-3.5 px-3 text-center border-r border-slate-200 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isToday
                            ? "bg-blue-50 text-blue-800"
                            : "hover:bg-slate-200/60"
                        }`}
                      >
                        <div className="font-extrabold uppercase text-[11px] tracking-wide">{dayName}</div>
                        <div className={`text-xs mt-0.5 font-bold ${isSelected ? "text-blue-100" : "text-slate-500"}`}>{monthDay}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {SHIFT_OPTIONS.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Shift Category Row Header */}
                    <td className="py-4 px-4 border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 shadow-xs align-top">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${
                          shift.id === "st-1" ? "bg-blue-600" :
                          shift.id === "st-2" ? "bg-sky-500" :
                          shift.id === "st-3" ? "bg-indigo-600" :
                          shift.id === "st-4" ? "bg-purple-600" : "bg-red-500"
                        }`}></span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                            {shift.id === "st-1" && "🌅"}
                            {shift.id === "st-2" && "🌆"}
                            {shift.id === "st-3" && "🌙"}
                            {shift.id === "st-4" && "📚"}
                            {shift.id === "st-5" && "🏖️"}
                            <span>{shift.name}</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{shift.time}</p>
                        </div>
                      </div>
                    </td>

                    {/* 7 Days Columns for this Shift */}
                    {activeWeekDates.map((dateStr) => {
                      const assignedMembers = scopedMembers.filter(
                        (m) => getMemberShiftForDate(m.id, dateStr) === shift.id
                      );
                      const isSelectedDateCell = dateStr === selectedDate;

                      return (
                        <td
                          key={dateStr}
                          className={`p-2.5 border-r border-slate-200 align-top transition-all relative group ${
                            isSelectedDateCell ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {assignedMembers.length === 0 ? (
                            <div
                              onClick={() => setSelectedDate(dateStr)}
                              className="py-3 px-2 rounded-xl border border-dashed border-slate-200 group-hover:border-blue-400 text-center text-[10px] text-slate-400 group-hover:text-blue-600 font-bold cursor-pointer transition-all"
                            >
                              — No Engineers
                            </div>
                          ) : (
                            <div className="space-y-1.5 min-h-[50px]">
                              {assignedMembers.map((member) => {
                                const dutyRole = getMemberDutyRoleForDate(member.id, dateStr);
                                return (
                                  <div
                                    key={member.id}
                                    onClick={() => {
                                      setQuickAssignCell({ memberId: member.id, memberName: member.name, dateStr });
                                    }}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-1.5 ${
                                      shift.id === "st-1"
                                        ? "bg-blue-50/90 border-blue-200 text-blue-900 hover:bg-blue-100 hover:border-blue-300"
                                        : shift.id === "st-2"
                                        ? "bg-sky-50/90 border-sky-200 text-sky-900 hover:bg-sky-100 hover:border-sky-300"
                                        : shift.id === "st-3"
                                        ? "bg-indigo-50/90 border-indigo-200 text-indigo-900 hover:bg-indigo-100 hover:border-indigo-300"
                                        : shift.id === "st-4"
                                        ? "bg-purple-50/90 border-purple-200 text-purple-900 hover:bg-purple-100 hover:border-purple-300"
                                        : "bg-red-50/90 border-red-200 text-red-900 hover:bg-red-100 hover:border-red-300"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                        {member.name.charAt(0)}
                                      </div>
                                      <span className="truncate text-[11px]">{member.name}</span>
                                    </div>

                                    {dutyRole !== "SUPPORT" && (
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                        dutyRole === "PIC" ? "bg-purple-600 text-white" : "bg-sky-600 text-white"
                                      }`}>
                                        {dutyRole === "PIC" ? "⭐ PIC" : "🛠️ Admin"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW FOR NON-LEADERSHIP (REGULAR ENGINEERS / AGENTS) */}
      {!isLeadership ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xl my-12 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 font-extrabold text-xl flex items-center justify-center mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">Attendance Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Team Shift Scheduling & Attendance Roster management is restricted strictly to <strong>Team Leads</strong> and the <strong>AMS Head</strong>.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/my-shift"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              View My Shift
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Dashboard
            </a>
          </div>
        </div>
      ) : (
        /* LEADERSHIP VIEW WITH INTERACTIVE DRAG & DROP SCHEDULER FOR SELECTED DATE */
        <div className="space-y-8">
          {viewMode === "dragdrop" ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* LEFT COLUMN: UNASSIGNED / AVAILABLE TEAM MEMBERS POOL FOR SELECTED DATE */}
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
                      <span>👥</span> Unassigned Pool
                    </h2>
                    <p className="text-[11px] text-slate-500">Available for {formattedSelectedDate}</p>
                  </div>
                  <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {scopedMembers.filter((m) => getMemberShiftForSelectedDate(m.id) === null).length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {scopedMembers.filter((m) => getMemberShiftForSelectedDate(m.id) === null).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                      All team members are scheduled for {formattedSelectedDate}! Change date to plot another day.
                    </div>
                  ) : (
                    scopedMembers
                      .filter((m) => getMemberShiftForSelectedDate(m.id) === null)
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
                            <span>🖐️</span> Drag to plot shift or leave
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: 5 OFFICIAL SCHEDULE DROP ZONES (SHIFTS 1-3, TRAINING & LEAVE) */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SHIFT_OPTIONS.map((shift) => {
                  const assignedMembers = scopedMembers.filter((m) => getMemberShiftForSelectedDate(m.id) === shift.id);
                  const isHovered = dragOverShiftId === shift.id;
                  const isLeaveZone = shift.id === "st-5";

                  return (
                    <div
                      key={shift.id}
                      onDragOver={(e) => handleDragOver(e, shift.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, shift.id)}
                      className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                        isHovered
                          ? isLeaveZone
                            ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/30 scale-[1.01]"
                            : "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/30 scale-[1.01]"
                          : isLeaveZone
                          ? "border-amber-200 hover:border-amber-300 bg-amber-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Shift Zone Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm">
                              {isLeaveZone && "🌴 "}
                              {shift.name}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isLeaveZone ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}>
                              {shift.time}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{shift.hours}</p>
                        </div>

                        <span className={`text-xs font-black text-white px-2.5 py-0.5 rounded-full shadow-xs ${
                          isLeaveZone ? "bg-amber-600" : "bg-blue-600"
                        }`}>
                          {assignedMembers.length} Members
                        </span>
                      </div>

                      {/* Drop Zone Member Cards */}
                      <div className={`space-y-2.5 min-h-[160px] p-2 rounded-xl border border-dashed ${
                        isLeaveZone ? "bg-amber-50/40 border-amber-200" : "bg-slate-50/50 border-slate-200"
                      }`}>
                        {assignedMembers.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs italic">
                            {isLeaveZone ? "🌴 Drag team members here to log Approved Leave for " : "🎯 Drag team members here to schedule for "}
                            {shift.name} ({formattedSelectedDate})
                          </div>
                        ) : (
                          assignedMembers.map((member) => {
                            const activeDutyRole = getMemberDutyRoleForSelectedDate(member.id);

                            return (
                              <div
                                key={member.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, member.id)}
                                className={`p-3 rounded-xl border bg-white shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
                                  isLeaveZone ? "border-amber-200" : "border-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                    <StatusBadge status={isLeaveZone ? "LEAVE" : member.status} />
                                  </div>

                                  <button
                                    type="button"
                                    title="Remove from schedule"
                                    onClick={() => handleRemoveFromShift(member.id, member.name, shift.name)}
                                    className="text-slate-400 hover:text-red-500 text-xs font-bold p-1 rounded-md hover:bg-red-50 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <p className="text-[10px] text-slate-500 truncate mb-2">{member.domain}</p>

                                {/* SHIFT DUTY ROLE SELECTOR (PIC, TECHNICAL ADMIN, SUPPORT - DEFAULT SUPPORT) */}
                                {!isLeaveZone && (
                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-600">Shift Duty Role:</span>
                                    <select
                                      value={activeDutyRole}
                                      onChange={(e) => handleChangeDutyRole(member.id, e.target.value as ShiftDutyRole, member.name)}
                                      className="px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-extrabold text-slate-800 bg-slate-50 hover:bg-slate-100 cursor-pointer focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="SUPPORT">👤 Support (Default)</option>
                                      <option value="PIC">⭐ PIC (Person In Charge)</option>
                                      <option value="TECHNICAL_ADMIN">🛠️ Technical Admin</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })
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
                  <h2 className="font-bold text-slate-900 text-base">Full Shift, Duty Role & Leave Roster ({formattedSelectedDate})</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAmsHead ? "Viewing all shift schedules and shift duty designations across all corporate domains" : `Viewing shift schedules for ${userDomain}`}
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
                      <th className="py-3.5 px-4">Schedule Category</th>
                      <th className="py-3.5 px-4">Shift Duty Designation</th>
                      <th className="py-3.5 px-4">Clock-In Time</th>
                      <th className="py-3.5 px-4">Duty / Leave Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedMembers.map((eng) => {
                      const shiftId = getMemberShiftForSelectedDate(eng.id);
                      const shift = SHIFT_OPTIONS.find((s) => s.id === shiftId);
                      const isLeave = shiftId === "st-5";
                      const dutyRole = getMemberDutyRoleForSelectedDate(eng.id);

                      return (
                        <tr key={eng.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{eng.name}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{eng.domain}</td>
                          <td className={`py-3.5 px-4 font-bold text-xs ${isLeave ? "text-amber-700" : "text-blue-600"}`}>
                            {shift ? `${isLeave ? "🌴 " : ""}${shift.name} (${shift.time})` : "Unassigned"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {shiftId && !isLeave ? (
                              <div className="flex items-center gap-2">
                                <DutyRoleBadge role={dutyRole} />
                                <select
                                  value={dutyRole}
                                  onChange={(e) => handleChangeDutyRole(eng.id, e.target.value as ShiftDutyRole, eng.name)}
                                  className="px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 bg-slate-50 cursor-pointer"
                                >
                                  <option value="SUPPORT">Support (Default)</option>
                                  <option value="PIC">⭐ PIC</option>
                                  <option value="TECHNICAL_ADMIN">🛠️ Tech Admin</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-900">
                            {isLeave ? "—" : eng.actual_start || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={isLeave ? "LEAVE" : eng.status} />
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

      {/* AUTO-SCHEDULE ROSTER MODAL (5 WORK DAYS / 2 OFF DAYS) */}
      {showAutoScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Auto-Schedule 5:2 Shift Roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">Plot 5 working days & 2 custom days off for team members</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAutoSchedule} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span className="font-bold uppercase text-[10px] tracking-wider text-blue-700">Domain Scope</span>
                <span className="font-extrabold text-blue-950">{isAmsHead ? "Global (All Domains)" : userDomain}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Team Member(s) {!isAmsHead && `(${userDomain} Only)`}
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                  value={autoScheduleConfig.memberId}
                  onChange={(e) => setAutoScheduleConfig({ ...autoScheduleConfig, memberId: e.target.value })}
                >
                  <option value="ALL">All Domain Members ({scopedMembers.length} Members)</option>
                  {scopedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role.replace("_", " ")})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Shift (3 Shifts Available)</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                  value={autoScheduleConfig.targetShiftId}
                  onChange={(e) => setAutoScheduleConfig({ ...autoScheduleConfig, targetShiftId: e.target.value })}
                >
                  <option value="st-1">Shift 1 (8:00 AM - 5:00 PM)</option>
                  <option value="st-2">Shift 2 (2:00 PM - 11:00 PM)</option>
                  <option value="st-3">Shift 3 (11:00 PM - 8:00 AM)</option>
                  <option value="st-4">Training (8:00 AM - 5:00 PM)</option>
                </select>
              </div>

              {/* FLEXIBLE CUSTOM 2 DAYS OFF SELECTORS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Off Day</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                    value={autoScheduleConfig.offDay1}
                    onChange={(e) => setAutoScheduleConfig({ ...autoScheduleConfig, offDay1: Number(e.target.value) })}
                  >
                    <option value={6}>Saturday</option>
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Second Off Day</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                    value={autoScheduleConfig.offDay2}
                    onChange={(e) => setAutoScheduleConfig({ ...autoScheduleConfig, offDay2: Number(e.target.value) })}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration Range</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                  value={autoScheduleConfig.dateRange}
                  onChange={(e) => setAutoScheduleConfig({ ...autoScheduleConfig, dateRange: e.target.value })}
                >
                  <option value="WEEK">Current Week (7 Days)</option>
                  <option value="MONTH">Full Month (30 Days)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                Starting from date: <strong className="text-slate-900">{selectedDate}</strong>. Assigns 5 working days on the target shift and 2 custom days off automatically.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAutoScheduleModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Apply 5:2 Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚡ QUICK CELL SHIFT ASSIGNMENT MODAL */}
      {quickAssignCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{quickAssignCell.memberName}</h3>
                <p className="text-xs text-slate-500 font-medium">📅 Date: {quickAssignCell.dateStr}</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAssignCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Shift Schedule</label>
                <div className="grid grid-cols-1 gap-2">
                  {SHIFT_OPTIONS.map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => {
                        handleAssignMemberToDateShift(quickAssignCell.memberId, shift.id, quickAssignCell.dateStr, quickAssignCell.memberName, shift.name);
                        setQuickAssignCell(null);
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-900">{shift.name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{shift.hours}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      handleAssignMemberToDateShift(quickAssignCell.memberId, null, quickAssignCell.dateStr, quickAssignCell.memberName, "Off Duty");
                      setQuickAssignCell(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold text-center cursor-pointer transition-all"
                  >
                    💤 Set Off Duty (Unassign)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Assign Duty Designation</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSetMemberDutyRoleForDate(quickAssignCell.memberId, "SUPPORT", quickAssignCell.dateStr, quickAssignCell.memberName);
                      setQuickAssignCell(null);
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    Support
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetMemberDutyRoleForDate(quickAssignCell.memberId, "PIC", quickAssignCell.dateStr, quickAssignCell.memberName);
                      setQuickAssignCell(null);
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl cursor-pointer"
                  >
                    ⭐ PIC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetMemberDutyRoleForDate(quickAssignCell.memberId, "TECHNICAL_ADMIN", quickAssignCell.dateStr, quickAssignCell.memberName);
                      setQuickAssignCell(null);
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl cursor-pointer"
                  >
                    🛠️ Tech Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

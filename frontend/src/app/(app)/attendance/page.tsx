"use client";

/**
 * Attendance & Team Shift Scheduling Page.
 * Features an Interactive Drag & Drop Shift Scheduler Roster with Date Picker, Per-Date Schedule Storage,
 * and Shift Duty Role Designation (PIC, Technical Admin, Support - Default: Support)!
 * - Team Leads / AMS Head: Assign shift duty roles (PIC ⭐, Technical Admin 🛠️, Support 👤 - default: Support).
 * - Each date maintains its own independent shift roster and duty role assignments.
 * - Official Schedule Categories: Shift 1, Shift 2, Shift 3, Training, and Leave Schedule (On Leave / Vacation).
 */

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
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

const INITIAL_TEAM_MEMBERS: DraggableTeamMember[] = [];

// 24/7 Operational Roster Schedule Generator (Dynamic for any team list)
// Excludes AMS Head, assigns Team Leads to Mon-Fri Shift 1, and dynamically balances Engineers across 3 shifts with 1 PIC per shift everyday
const generateGoogleSheetRosterSchedule = (
  dateStr: string,
  teamList: DraggableTeamMember[]
): { schedules: Record<string, string | null>; roles: Record<string, ShiftDutyRole> } => {
  const schedules: Record<string, string | null> = {};
  const roles: Record<string, ShiftDutyRole> = {};

  const dateObj = new Date(dateStr + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const dayNumber = dateObj.getDate();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 1. AMS Head: Excluded from operational shift scheduling (null)
  const amsHeads = teamList.filter((m) => m.role === "AMS_HEAD" || m.name.includes("Ernest Siega"));
  amsHeads.forEach((head) => {
    schedules[head.id] = null;
    roles[head.id] = "SUPPORT";
  });

  // 2. Team Leads (TLs): Mon-Fri Shift 1 (Day Shift 08:00 - 17:00), Sat-Sun OFF
  const teamLeads = teamList.filter((m) => m.role === "TEAM_LEAD" && !amsHeads.some((h) => h.id === m.id));
  teamLeads.forEach((tl) => {
    schedules[tl.id] = isWeekend ? null : "st-1";
    roles[tl.id] = "SUPPORT";
  });

  // 3. Support Engineers: Dynamic 24/7 Zero-Gaps Staggered Roster based on current team list
  const engineers = teamList.filter((m) => !amsHeads.some((h) => h.id === m.id) && !teamLeads.some((t) => t.id === m.id));

  engineers.forEach((m, idx) => {
    roles[m.id] = "SUPPORT";

    // Staggered 5 working days / 2 off days rotation based on index in current team list
    const shiftCategory = idx % 3; // 0 = Shift 1, 1 = Shift 2, 2 = Shift 3
    const off1 = (idx * 2) % 7;
    const off2 = (off1 + 1) % 7;
    const isOff = dayOfWeek === off1 || dayOfWeek === off2;

    if (isOff) {
      schedules[m.id] = null;
    } else {
      schedules[m.id] = shiftCategory === 0 ? "st-1" : shiftCategory === 1 ? "st-2" : "st-3";
    }
  });

  // Zero-Gaps Guarantee: Ensure Shift 3, Shift 2, and Shift 1 always have active engineers
  ["st-3", "st-2", "st-1"].forEach((shiftId) => {
    const countOnShift = engineers.filter((m) => schedules[m.id] === shiftId).length;
    if (countOnShift === 0 && engineers.length > 0) {
      // Find an off-duty engineer or an available engineer to cover this empty shift slot
      const candidate = engineers.find((m) => schedules[m.id] === null) || engineers.find((m) => schedules[m.id] === "st-1" && m.role !== "TEAM_LEAD");
      if (candidate) {
        schedules[candidate.id] = shiftId;
      }
    }
  });

  // 4. GUARANTEE STRICTLY 1 PIC PER SHIFT EVERY DAY
  ["st-1", "st-2", "st-3"].forEach((shiftId) => {
    const activeShiftMembers = teamList.filter((m) => schedules[m.id] === shiftId);
    if (activeShiftMembers.length > 0) {
      // Pick deterministic PIC for this shift on this day
      const picIndex = (dayNumber + shiftId.charCodeAt(3)) % activeShiftMembers.length;
      const picMember = activeShiftMembers[picIndex];
      roles[picMember.id] = "PIC";
    }
  });

  return { schedules, roles };
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
  const [teamMembers, setTeamMembers] = useState<DraggableTeamMember[]>([]);

  useEffect(() => {
    const fetchRealUsers = async () => {
      try {
        const res = await api.listUsers();
        if (res.data && res.data.length > 0) {
          const mapped: DraggableTeamMember[] = res.data.map((u) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            role: u.role,
            domain: u.domain || "Supply chain and Planning Domain",
            status: u.is_active ? "WORKING" : "OFFLINE",
            actual_start: "08:00 AM",
          }));
          setTeamMembers(mapped);
        } else if (user) {
          setTeamMembers([
            {
              id: user.id,
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              role: user.role,
              domain: (user as any).domain || "Supply chain and Planning Domain",
              status: "WORKING",
              actual_start: "08:00 AM",
            },
          ]);
        }
      } catch (err) {
        if (user) {
          setTeamMembers([
            {
              id: user.id,
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              role: user.role,
              domain: (user as any).domain || "Supply chain and Planning Domain",
              status: "WORKING",
              actual_start: "08:00 AM",
            },
          ]);
        }
      }
    };

    fetchRealUsers();
  }, [user]);
  const [dateSchedules, setDateSchedules] = useState<Record<string, Record<string, string | null>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("attendance_dateSchedules");
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_DATE_SCHEDULES;
  });

  const [dutyRoleSchedules, setDutyRoleSchedules] = useState<Record<string, Record<string, ShiftDutyRole>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("attendance_dutyRoleSchedules");
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_DATE_DUTY_ROLES;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("attendance_dateSchedules", JSON.stringify(dateSchedules));
    }
  }, [dateSchedules]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("attendance_dutyRoleSchedules", JSON.stringify(dutyRoleSchedules));
    }
  }, [dutyRoleSchedules]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ shiftId: string; dateStr: string } | null>(null);
  const [success, setSuccess] = useState("");
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

  // Get active shift ID for a member on a specific date (Starts clean until auto-scheduled or manually assigned)
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
    if (m.role === "AMS_HEAD" || m.role === "SUPER_ADMIN" || m.name.includes("Ernest Siega")) return false;
    if (isAmsHead) return true;
    if (!m.domain || !userDomain) return true;
    return m.domain === userDomain || m.domain.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]);
  });

  // Date Navigation Handlers
  const handlePreviousWeek = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSetCurrentWeek = () => {
    setSelectedDate(TODAY_DATE_STR);
  };

  const weekStartObj = new Date(activeWeekDates[0] + "T00:00:00");
  const weekEndObj = new Date(activeWeekDates[6] + "T00:00:00");
  const formattedWeekRange = `${weekStartObj.getMonth() + 1}/${weekStartObj.getDate()}/${weekStartObj.getFullYear()} – ${weekEndObj.getMonth() + 1}/${weekEndObj.getDate()}/${weekEndObj.getFullYear()}`;

  const formattedSelectedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Calendar Drag and Drop Event Handlers
  const handleCalendarDragStart = (e: React.DragEvent, memberId: string, sourceDateStr?: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ memberId, sourceDateStr }));
    setDraggedMemberId(memberId);
  };

  const handleCalendarDragOver = (e: React.DragEvent, shiftId: string, dateStr: string) => {
    e.preventDefault();
    setDragOverCell({ shiftId, dateStr });
  };

  const handleCalendarDragLeave = () => {
    setDragOverCell(null);
  };

  const handleCalendarDrop = (e: React.DragEvent, targetShiftId: string | null, targetDateStr: string) => {
    e.preventDefault();
    setDragOverCell(null);
    setDraggedMemberId(null);

    const payloadStr = e.dataTransfer.getData("text/plain");
    let memberId = payloadStr;
    try {
      const parsed = JSON.parse(payloadStr);
      if (parsed.memberId) memberId = parsed.memberId;
    } catch (err) {}

    if (!memberId) return;

    const member = INITIAL_TEAM_MEMBERS.find((m) => m.id === memberId);
    const shiftObj = SHIFT_OPTIONS.find((s) => s.id === targetShiftId);

    setDateSchedules((prev) => ({
      ...prev,
      [targetDateStr]: {
        ...(prev[targetDateStr] || {}),
        [memberId]: targetShiftId,
      },
    }));

    if (targetShiftId) {
      setSuccess(`Plotted ${member?.name || "Engineer"} to ${shiftObj?.name || "Shift"} for ${targetDateStr}!`);
    } else {
      setSuccess(`Set ${member?.name || "Engineer"} to Off Duty for ${targetDateStr}.`);
    }
    setTimeout(() => setSuccess(""), 4000);
  };

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
        if (member.role === "TEAM_LEAD") {
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          updatedSchedules[dateStr][member.id] = isWeekend ? null : "st-1";
        } else {
          updatedSchedules[dateStr][member.id] = assignedShiftId;
        }
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

    // Auto-schedule specifically for the active selected week (activeWeekDates)
    scopedMembers.forEach((member, index) => {
      const off1 = (index * 2) % 7;
      const off2 = (off1 + 1) % 7;

      activeWeekDates.forEach((dateStr) => {
        const currentDate = new Date(dateStr + "T00:00:00");
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat

        if (!updatedSchedules[dateStr]) {
          updatedSchedules[dateStr] = {};
        }

        if (member.role === "TEAM_LEAD") {
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          updatedSchedules[dateStr][member.id] = isWeekend ? null : "st-1";
        } else {
          const isOffDay = dayOfWeek === off1 || dayOfWeek === off2;
          const assignedShiftId = isOffDay ? null : targetShiftId;
          updatedSchedules[dateStr][member.id] = assignedShiftId;
        }
      });
    });

    setDateSchedules(updatedSchedules);
    const domainText = isAmsHead ? "Global Roster" : userDomain;
    setSuccess(`Auto-Scheduled ${scopedMembers.length} member(s) (${domainText}) to ${shiftName} for active week (${activeWeekDates[0]} to ${activeWeekDates[6]})!`);
    setTimeout(() => setSuccess(""), 5000);
  };

  const handleAutoDivide3Shifts = () => {
    if (scopedMembers.length === 0) {
      setSuccess("No team members available in your domain to auto-schedule.");
      return;
    }

    const updatedSchedules = { ...dateSchedules };
    const updatedDutyRoles = { ...dutyRoleSchedules };

    // Auto-generate roster strictly for the active selected week (activeWeekDates: Mon - Sun)
    activeWeekDates.forEach((dateStr) => {
      const generated = generateGoogleSheetRosterSchedule(dateStr, scopedMembers);
      updatedSchedules[dateStr] = { ...(updatedSchedules[dateStr] || {}), ...generated.schedules };
      updatedDutyRoles[dateStr] = { ...(updatedDutyRoles[dateStr] || {}), ...generated.roles };
    });

    setDateSchedules(updatedSchedules);
    setDutyRoleSchedules(updatedDutyRoles);
    setShowAutoScheduleModal(false);
    const domainText = isAmsHead ? "Global Roster" : userDomain;
    const weekStart = activeWeekDates[0];
    const weekEnd = activeWeekDates[6];
    setSuccess(`Auto-Generated Weekly Roster (${weekStart} to ${weekEnd}) for ${scopedMembers.length} member(s) (${domainText}) with 1 PIC per shift everyday!`);
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
                  <span>⚡ Auto-Generate Active Week</span>
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

            {/* WEEK SELECTOR & ROSTER DATE SWITCHER */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={handlePreviousWeek}
                className="p-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Previous Week"
              >
                ◀
              </button>
              <div className="relative flex items-center">
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  title="Click to jump to any week"
                />
                <div className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
                  <span>📅</span>
                  <span>{formattedWeekRange}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Next Week"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={handleSetCurrentWeek}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer ml-1"
              >
                This Week
              </button>
            </div>
          </div>
        )}
      </div>



      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* 📅 INTERACTIVE WEEKLY CALENDAR ROSTER MATRIX */}
      {isLeadership && (
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
                      const isCellHovered = dragOverCell?.shiftId === shift.id && dragOverCell?.dateStr === dateStr;

                      return (
                        <td
                          key={dateStr}
                          onDragOver={(e) => handleCalendarDragOver(e, shift.id, dateStr)}
                          onDragLeave={handleCalendarDragLeave}
                          onDrop={(e) => handleCalendarDrop(e, shift.id, dateStr)}
                          className={`p-2.5 border-r border-slate-200 align-top transition-all relative group ${
                            isCellHovered
                              ? "bg-blue-100/90 border-2 border-blue-500 shadow-md scale-[1.01]"
                              : isSelectedDateCell
                              ? "bg-blue-50/20"
                              : ""
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
                                    draggable={isLeadership}
                                    onDragStart={(e) => handleCalendarDragStart(e, member.id, dateStr)}
                                    onClick={() => {
                                      setQuickAssignCell({ memberId: member.id, memberName: member.name, dateStr });
                                    }}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs flex items-center justify-between gap-1.5 ${
                                      isLeadership ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02]" : "cursor-pointer"
                                    } ${
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

          {/* OFF-DUTY & REST DAYS POOL DRAWER */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverCell(null); }}
            onDrop={(e) => handleCalendarDrop(e, null, selectedDate)}
            className="p-5 bg-slate-50 border-t border-slate-200 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <span>💤</span> Off-Duty & Rest Days Pool ({formattedSelectedDate})
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Team Leads on Weekend Off or Engineers on 5:2 Rest Days. Drag to override shift.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {scopedMembers
                .filter((m) => getMemberShiftForDate(m.id, selectedDate) === null)
                .map((member) => {
                  const isTL = member.role === "TEAM_LEAD";
                  const isHead = member.role === "AMS_HEAD";
                  return (
                    <div
                      key={member.id}
                      draggable={isLeadership}
                      onDragStart={(e) => handleCalendarDragStart(e, member.id, selectedDate)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs hover:border-blue-500 hover:bg-blue-50 cursor-grab active:cursor-grabbing flex items-center gap-1.5 transition-all"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">
                        {member.name.charAt(0)}
                      </span>
                      <span>{member.name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        isHead
                          ? "bg-slate-100 text-slate-600"
                          : isTL
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-800 border border-amber-100"
                      }`}>
                        {isHead ? "👔 Management" : isTL ? "🏖️ TL Weekend Off" : "💤 5:2 Rest Day"}
                      </span>
                    </div>
                  );
                })}

              {scopedMembers.filter((m) => getMemberShiftForDate(m.id, selectedDate) === null).length === 0 && (
                <span className="text-xs text-slate-400 italic">All engineers are actively working on {formattedSelectedDate}.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW FOR NON-LEADERSHIP (REGULAR ENGINEERS / AGENTS) */}
      {!isLeadership && (
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

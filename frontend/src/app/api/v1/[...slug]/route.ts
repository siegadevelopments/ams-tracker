import { NextRequest, NextResponse } from "next/server";

/**
 * Clean Production API Handler for /api/v1/*
 * Single AMS Head user account (Ernest Siega).
 */

const DEMO_USER = {
  id: "usr-head-001",
  email: "ernest.siega@ark.co.th",
  first_name: "Ernest",
  last_name: "Siega",
  employee_id: "ARK-HEAD-001",
  role: "AMS_HEAD",
  domain: "AMS Operations",
  lotuss_name: "LTT",
  timezone: "Asia/Bangkok",
  is_active: true,
};

// Store containing ONLY the AMS Head
let teamMembersStore: any[] = [
  DEMO_USER,
];

let currentShiftState: any = {
  id: "att-001",
  user_id: DEMO_USER.id,
  user_name: "Ernest Siega",
  status: "OFF_DUTY",
  attendance_date: new Date().toISOString().split("T")[0],
  scheduled_start_utc: `${new Date().toISOString().split("T")[0]}T08:00:00Z`,
  scheduled_end_utc: `${new Date().toISOString().split("T")[0]}T17:00:00Z`,
  actual_start_utc: null,
  actual_end_utc: null,
  late_minutes: 0,
};

const CLEAN_TICKETS = [
  {
    id: "tck-2101115",
    ticket_number: "#2101115",
    title: "HO - Please help to monitor for POG Pending : 23 Aug 2026",
    description: "Planogram pending monitoring for cosmetic sachet items at Lotus's store #04T.",
    ticket_type: "SERVICE_REQUEST",
    priority: "P2",
    status: "IN_PROGRESS",
    category: "Supply Chain / POG",
    environment: "PROD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: "ernest.siega@ark.co.th",
  },
  {
    id: "tck-2098927",
    ticket_number: "#2098927",
    title: "BY FnR - Range to Check #12717652",
    description: "Forecast & Replenishment range validation for commercial merchandise inventory.",
    ticket_type: "INCIDENT",
    priority: "P3",
    status: "OPEN",
    category: "Buy & Merchandise / FnR",
    environment: "PROD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: "ernest.siega@ark.co.th",
  },
  {
    id: "tck-2099410",
    ticket_number: "#2099410",
    title: "POS Gateway Timeout at Store #9401 Bangna Branch",
    description: "Payment gateway response degradation during peak checkout hours. Network logs collected.",
    ticket_type: "INCIDENT",
    priority: "P1",
    status: "IN_PROGRESS",
    category: "Store Ops / POS",
    environment: "PROD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: "ernest.siega@ark.co.th",
  },
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1/, "");

  if (path === "/auth/me" || path === "/auth/me/") {
    return NextResponse.json(DEMO_USER);
  }

  if (path === "/users" || path === "/users/") {
    return NextResponse.json({
      data: teamMembersStore,
      message: "Users fetched",
    });
  }

  if (path === "/users/leads" || path === "/users/leads/") {
    const leads = teamMembersStore.filter(u => u.role === "TEAM_LEAD" || u.role === "AMS_HEAD");
    return NextResponse.json({
      data: leads,
      message: "Team leads fetched",
    });
  }

  if (path === "/tickets" || path === "/tickets/") {
    return NextResponse.json({
      data: CLEAN_TICKETS,
      pagination: {
        page: 1,
        page_size: 20,
        total_items: CLEAN_TICKETS.length,
        total_pages: 1,
      },
    });
  }

  if (path === "/attendance/status" || path === "/attendance/status/") {
    return NextResponse.json({
      data: currentShiftState,
    });
  }

  if (path === "/attendance/team-status" || path === "/attendance/team-status/") {
    return NextResponse.json({
      data: {
        total_members: teamMembersStore.length,
        working: 1,
        late: 0,
        on_break: 0,
        not_started: 0,
        absent: 0,
        employees: teamMembersStore.map(u => ({
          user_id: u.id,
          user_name: `${u.first_name} ${u.last_name}`,
          employee_id: u.employee_id,
          shift_type: "Shift 1 (8AM - 5PM)",
          scheduled_start: "08:00",
          scheduled_end: "17:00",
          actual_start: "08:00",
          status: "WORKING",
          late_minutes: 0,
        })),
      },
    });
  }

  if (path === "/reports/sla" || path === "/reports/sla/") {
    return NextResponse.json({
      data: {
        overall_compliance_percent: 100,
        total_tickets: CLEAN_TICKETS.length,
        met_sla_count: CLEAN_TICKETS.length,
        breached_sla_count: 0,
        by_priority: [
          { priority: "P1", total: 1, met: 1, compliance_percent: 100 },
          { priority: "P2", total: 1, met: 1, compliance_percent: 100 },
          { priority: "P3", total: 1, met: 1, compliance_percent: 100 },
          { priority: "P4", total: 0, met: 0, compliance_percent: 100 },
        ],
      },
    });
  }

  return NextResponse.json({ data: [], message: "Endpoint active" });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const body = await request.json().catch(() => ({}));

  if (path === "/auth/login" || path === "/auth/login/") {
    return NextResponse.json({
      access_token: "demo-jwt-token-ark-co-th",
      refresh_token: "demo-refresh-token-ark-co-th",
      token_type: "bearer",
      user: DEMO_USER,
      data: {
        user: DEMO_USER,
        token: "demo-jwt-token-ark-co-th",
        access_token: "demo-jwt-token-ark-co-th",
      },
      message: "Login successful",
    });
  }

  if (path === "/users/assign-lead" || path === "/users/assign-lead/") {
    const existingIndex = teamMembersStore.findIndex(
      (u) => u.domain === body.domain && u.role === "TEAM_LEAD"
    );

    const newLead = {
      id: `tl-${Date.now()}`,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      employee_id: `ARK-TL-${Math.floor(100 + Math.random() * 900)}`,
      role: "TEAM_LEAD",
      domain: body.domain,
      lotuss_name: body.lotuss_name || "LTT",
      timezone: "Asia/Bangkok",
      is_active: true,
    };

    if (existingIndex >= 0) {
      teamMembersStore[existingIndex] = newLead;
    } else {
      teamMembersStore.push(newLead);
    }

    return NextResponse.json({
      data: newLead,
      message: `Successfully assigned ${body.first_name} ${body.last_name} as Team Lead for ${body.domain}`,
    });
  }

  if (path === "/attendance/clock-in" || path === "/attendance/clock-in/") {
    currentShiftState = {
      ...currentShiftState,
      status: "WORKING",
      actual_start_utc: new Date().toISOString(),
    };
    return NextResponse.json({
      data: currentShiftState,
      message: "Clocked in successfully",
    });
  }

  if (path === "/attendance/clock-out" || path === "/attendance/clock-out/") {
    currentShiftState = {
      ...currentShiftState,
      status: "OFF_DUTY",
      actual_end_utc: new Date().toISOString(),
    };
    return NextResponse.json({
      data: currentShiftState,
      message: "Clocked out successfully",
    });
  }

  return NextResponse.json({ data: body, message: "Action recorded" });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: body, message: "Updated" });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: body, message: "Updated" });
}

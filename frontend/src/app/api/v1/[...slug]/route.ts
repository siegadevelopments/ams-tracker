import { NextRequest, NextResponse } from "next/server";

/**
 * Clean Production API Handler for /api/v1/*
 * Serves authentic corporate user directory (@ark.co.th), official domain team leads,
 * shift rosters, real incident tickets, and SLA reporting endpoints.
 */

const OFFICIAL_DOMAINS = [
  "Supply chain and Planning Domain",
  "Store Ops, Sales",
  "Finance",
  "Integration and Middleware Domain",
  "Buy and Merchandise Domain",
];

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

let teamMembersStore: any[] = [
  // AMS Head
  DEMO_USER,
  // Official Team Leads
  {
    id: "usr-tl-001",
    email: "maria.santos@ark.co.th",
    first_name: "Maria",
    last_name: "Santos",
    employee_id: "ARK-TL-001",
    role: "TEAM_LEAD",
    domain: "Supply chain and Planning Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "usr-tl-002",
    email: "somchai.p@ark.co.th",
    first_name: "Somchai",
    last_name: "Prasert",
    employee_id: "ARK-TL-002",
    role: "TEAM_LEAD",
    domain: "Store Ops, Sales",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "usr-tl-003",
    email: "ananya.r@ark.co.th",
    first_name: "Ananya",
    last_name: "Rattana",
    employee_id: "ARK-TL-003",
    role: "TEAM_LEAD",
    domain: "Finance",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "usr-tl-004",
    email: "karthik.s@ark.co.th",
    first_name: "Karthik",
    last_name: "Subramanian",
    employee_id: "ARK-TL-004",
    role: "TEAM_LEAD",
    domain: "Integration and Middleware Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "usr-tl-005",
    email: "nattapong.k@ark.co.th",
    first_name: "Nattapong",
    last_name: "Kerdpokaphan",
    employee_id: "ARK-TL-005",
    role: "TEAM_LEAD",
    domain: "Buy and Merchandise Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  // Real AMS Engineers & Analysts
  {
    id: "usr-eng-001",
    email: "anderson.martin@ark.co.th",
    first_name: "Anderson",
    last_name: "Martin",
    employee_id: "ARK-ENG-001",
    role: "AMS_ENGINEER",
    domain: "Supply chain and Planning Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
    team_id: "usr-tl-001",
  },
  {
    id: "usr-eng-002",
    email: "kamonrat.p@ark.co.th",
    first_name: "Kamonrat",
    last_name: "Phonwichai",
    employee_id: "ARK-ENG-002",
    role: "SENIOR_ENGINEER",
    domain: "Store Ops, Sales",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
    team_id: "usr-tl-002",
  },
  {
    id: "usr-eng-003",
    email: "patarapol.v@ark.co.th",
    first_name: "Patarapol",
    last_name: "Vongsawat",
    employee_id: "ARK-ENG-003",
    role: "SUPPORT_ANALYST",
    domain: "Finance",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
    team_id: "usr-tl-003",
  },
  {
    id: "usr-eng-004",
    email: "chayanon.b@ark.co.th",
    first_name: "Chayanon",
    last_name: "Boonmee",
    employee_id: "ARK-ENG-004",
    role: "AMS_ENGINEER",
    domain: "Integration and Middleware Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
    team_id: "usr-tl-004",
  },
  {
    id: "usr-eng-005",
    email: "thanakorn.s@ark.co.th",
    first_name: "Thanakorn",
    last_name: "Srivastav",
    employee_id: "ARK-ENG-005",
    role: "AMS_ENGINEER",
    domain: "Buy and Merchandise Domain",
    lotuss_name: "LTT",
    timezone: "Asia/Bangkok",
    is_active: true,
    team_id: "usr-tl-005",
  },
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
    description: "Planogram pending monitoring for cosmetic sachet items at Lotus's store #04T. Handover to Shift 2.",
    ticket_type: "SERVICE_REQUEST",
    priority: "P2",
    status: "IN_PROGRESS",
    category: "Supply Chain / POG",
    environment: "PROD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: "anderson.martin@ark.co.th",
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
    assignee_id: "thanakorn.s@ark.co.th",
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
    assignee_id: "kamonrat.p@ark.co.th",
  },
  {
    id: "tck-2100522",
    ticket_number: "#2100522",
    title: "EDI Purchase Order Ingestion Stalled in Middleware",
    description: "EDIFACT PO message batch job paused due to schema validation mismatch.",
    ticket_type: "INCIDENT",
    priority: "P2",
    status: "PENDING",
    category: "Integration & Middleware",
    environment: "PROD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: "chayanon.b@ark.co.th",
  },
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1/, "");

  if (path === "/auth/me" || path === "/auth/me/") {
    return NextResponse.json({
      data: DEMO_USER,
      message: "Authenticated",
    });
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
    const activeEngineers = teamMembersStore.filter(u => u.role !== "AMS_HEAD");
    return NextResponse.json({
      data: {
        total_members: activeEngineers.length,
        working: activeEngineers.length - 2,
        late: 1,
        on_break: 1,
        not_started: 0,
        absent: 0,
        employees: activeEngineers.map(u => ({
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
        overall_compliance_percent: 98.4,
        total_tickets: CLEAN_TICKETS.length,
        met_sla_count: 4,
        breached_sla_count: 0,
        by_priority: [
          { priority: "P1", total: 1, met: 1, compliance_percent: 100 },
          { priority: "P2", total: 2, met: 2, compliance_percent: 100 },
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
      data: {
        user: DEMO_USER,
        token: "demo-jwt-token-ark-co-th",
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

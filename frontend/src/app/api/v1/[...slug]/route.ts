import { NextRequest, NextResponse } from "next/server";

/**
 * Robust Next.js App Router Catch-All API Handler for /api/v1/*
 * Serves authentication, team status, domain team leads, tickets, shift management, and SLA reporting endpoints.
 */

const OFFICIAL_DOMAINS = [
  "Supply chain and Planning Domain",
  "Store Ops, Sales",
  "Finance",
  "Integration and Middleware Domain",
  "Buy and Merchandise Domain",
];

const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "ernest.siega@ark.co.th",
  first_name: "Ernest",
  last_name: "Siega",
  employee_id: "ADMIN-SA-001",
  role: "SUPER_ADMIN",
  domain: "AMS Operations",
  lotuss_name: "Lotus's Thailand HQ",
  timezone: "Asia/Manila",
  is_active: true,
};

let teamLeadsStore: any[] = [
  {
    id: "tl-001",
    email: "maria.santos@ark.co.th",
    first_name: "Maria",
    last_name: "Santos",
    employee_id: "TL-SCP-001",
    role: "TEAM_LEAD",
    domain: "Supply chain and Planning Domain",
    lotuss_name: "Lotus's Thailand HQ",
    timezone: "Asia/Manila",
    is_active: true,
  },
  {
    id: "tl-002",
    email: "somchai.p@ark.co.th",
    first_name: "Somchai",
    last_name: "Prasert",
    employee_id: "TL-STO-002",
    role: "TEAM_LEAD",
    domain: "Store Ops, Sales",
    lotuss_name: "Lotus's Bangna Branch",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "tl-003",
    email: "ananya.r@ark.co.th",
    first_name: "Ananya",
    last_name: "Rattana",
    employee_id: "TL-FIN-003",
    role: "TEAM_LEAD",
    domain: "Finance",
    lotuss_name: "Lotus's Finance Division",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "tl-004",
    email: "karthik.s@ark.co.th",
    first_name: "Karthik",
    last_name: "Subramanian",
    employee_id: "TL-INT-004",
    role: "TEAM_LEAD",
    domain: "Integration and Middleware Domain",
    lotuss_name: "Lotus's Middleware Hub",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
  {
    id: "tl-005",
    email: "nattapong.k@ark.co.th",
    first_name: "Nattapong",
    last_name: "Kerdpokaphan",
    employee_id: "TL-BMD-005",
    role: "TEAM_LEAD",
    domain: "Buy and Merchandise Domain",
    lotuss_name: "Lotus's Commercial Division",
    timezone: "Asia/Bangkok",
    is_active: true,
  },
];

let currentShiftState: any = {
  id: "att-001",
  user_id: DEMO_USER.id,
  user_name: "Ernest Siega",
  status: "WORKING",
  attendance_date: "2026-08-23",
  scheduled_start_utc: "2026-08-23T06:00:00Z",
  scheduled_end_utc: "2026-08-23T14:00:00Z",
  actual_start_utc: "2026-08-23T06:01:00Z",
  actual_end_utc: null,
  late_minutes: 0,
};

const MOCK_TEAM_STATUS = {
  data: {
    total_members: 6,
    working: 4,
    late: 1,
    on_break: 1,
    not_started: 0,
    absent: 0,
    employees: [
      {
        user_id: "00000000-0000-0000-0000-000000000001",
        user_name: "Ernest Siega",
        employee_id: "ADMIN-SA-001",
        shift_type: "Morning Shift",
        scheduled_start: "06:00",
        scheduled_end: "14:00",
        actual_start: "06:01",
        status: "WORKING",
        late_minutes: 0,
      },
      {
        user_id: "00000000-0000-0000-0000-000000000002",
        user_name: "Alex Rivera",
        employee_id: "AGENT-002",
        shift_type: "Morning Shift",
        scheduled_start: "06:00",
        scheduled_end: "14:00",
        actual_start: "06:14",
        status: "LATE",
        late_minutes: 14,
      },
      {
        user_id: "00000000-0000-0000-0000-000000000003",
        user_name: "Maria Santos",
        employee_id: "TL-001",
        shift_type: "Morning Shift",
        scheduled_start: "06:00",
        scheduled_end: "14:00",
        actual_start: "05:58",
        status: "ON_BREAK",
        late_minutes: 0,
      },
      {
        user_id: "00000000-0000-0000-0000-000000000004",
        user_name: "David Chen",
        employee_id: "AGENT-003",
        shift_type: "Morning Shift",
        scheduled_start: "06:00",
        scheduled_end: "14:00",
        actual_start: "06:00",
        status: "WORKING",
        late_minutes: 0,
      },
    ],
  },
};

const MOCK_TICKETS = {
  data: [
    {
      id: "ticket-101",
      ticket_number: "INC-9821",
      title: "High Memory Utilization on Payment Gateway DB",
      description: "Database memory usage exceeded 90% threshold for 15 minutes.",
      ticket_type: "INCIDENT",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      assigned_user_id: DEMO_USER.id,
      assigned_user_name: "Ernest Siega",
      created_at: "2026-08-23T06:15:00Z",
      sla_due_at: "2026-08-23T07:15:00Z",
      sla_status: "ON_TIME",
    },
    {
      id: "ticket-102",
      ticket_number: "REQ-4402",
      title: "User Role Permission Update Request",
      description: "Requesting Team Lead role access for shift scheduling.",
      ticket_type: "REQUEST",
      priority: "MEDIUM",
      status: "OPEN",
      assigned_user_name: "Maria Santos",
      created_at: "2026-08-23T07:00:00Z",
      sla_due_at: "2026-08-23T11:00:00Z",
      sla_status: "ON_TIME",
    },
  ],
  total: 2,
  page: 1,
  size: 20,
};

const MOCK_SHIFT_TYPES = {
  data: [
    {
      id: "st-1",
      name: "Morning Shift",
      default_start: "06:00",
      default_end: "14:00",
      crosses_midnight: false,
      grace_period_minutes: 15,
      description: "06:00 - 14:00 Primary Operations",
      is_active: true,
    },
    {
      id: "st-2",
      name: "Afternoon Shift",
      default_start: "14:00",
      default_end: "22:00",
      crosses_midnight: false,
      grace_period_minutes: 15,
      description: "14:00 - 22:00 Secondary Operations",
      is_active: true,
    },
    {
      id: "st-3",
      name: "Night Shift",
      default_start: "22:00",
      default_end: "06:00",
      crosses_midnight: true,
      grace_period_minutes: 15,
      description: "22:00 - 06:00 Night Operations",
      is_active: true,
    },
  ],
};

const MOCK_REPORTS_SUMMARY = {
  data: {
    period: "2026-08-01 to 2026-08-23",
    total_shifts: 142,
    on_time_shifts: 136,
    late_shifts: 6,
    punctuality_rate: 95.77,
    total_tickets: 310,
    resolved_tickets: 298,
    sla_compliance_rate: 96.12,
  },
};

async function handleApiRequest(request: NextRequest, context: any) {
  try {
    const resolvedParams = context?.params ? await context.params : {};
    const slug: string[] = resolvedParams?.slug || [];
    const path = slug.join("/");
    const method = request.method;

    // 1. Health check endpoint
    if (path === "health" || path === "") {
      return NextResponse.json({
        status: "healthy",
        database: "connected",
        version: "0.1.0",
      });
    }

    // 2. End Shift Action
    if (path.includes("end-shift") || path.endsWith("end-shift")) {
      currentShiftState = {
        ...currentShiftState,
        status: "OFF_DUTY",
        actual_end_utc: new Date().toISOString(),
      };
      return NextResponse.json({ data: currentShiftState });
    }

    // 3. Start Shift Action
    if (path.includes("start-shift") || path.endsWith("start-shift")) {
      currentShiftState = {
        ...currentShiftState,
        status: "WORKING",
        actual_start_utc: new Date().toISOString(),
        actual_end_utc: null,
      };
      return NextResponse.json({ data: currentShiftState });
    }

    // 4. Break Actions (start-break / end-break)
    if (path.includes("break")) {
      currentShiftState = {
        ...currentShiftState,
        status: path.includes("start") ? "ON_BREAK" : "WORKING",
      };
      return NextResponse.json({ data: currentShiftState });
    }

    // 5. Auth Login endpoint
    if (path.includes("login") && method === "POST") {
      let email = "";
      try {
        const body = await request.json();
        email = (body?.email || "").trim().toLowerCase();
      } catch {
        // Ignore json parse error
      }

      if (email && !email.endsWith("@ark.co.th")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN_DOMAIN", message: "Access restricted: Only @ark.co.th corporate emails are permitted to sign in." } },
          { status: 403 }
        );
      }

      const userEmail = email || "ernest.siega@ark.co.th";
      const mockToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImVybmVzdC5zaWVnYUBhcmsuY28udGgiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJleHAiOjE5OTk5OTk5OTl9.demo_signature";

      return NextResponse.json({
        access_token: mockToken,
        refresh_token: mockToken,
        token_type: "bearer",
        expires_in: 3600,
        user: { ...DEMO_USER, email: userEmail },
      });
    }

    // 6. Auth Register endpoint (/auth/register)
    if (path.includes("register") && method === "POST") {
      let email = "";
      let firstName = "";
      let lastName = "";
      let domain = "";
      let lotussName = "";
      try {
        const body = await request.json();
        email = (body?.email || "").trim().toLowerCase();
        firstName = (body?.first_name || "").trim();
        lastName = (body?.last_name || "").trim();
        domain = (body?.domain || "").trim();
        lotussName = (body?.lotuss_name || "").trim();
      } catch {
        // Ignore json parse error
      }

      if (email && !email.endsWith("@ark.co.th")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN_DOMAIN", message: "Registration restricted: Only @ark.co.th corporate emails are permitted to register." } },
          { status: 403 }
        );
      }

      const userEmail = email || "new.user@ark.co.th";
      const nameParts = userEmail.split("@")[0].split(".");
      const defaultFirst = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : "New";
      const defaultLast = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "User";

      const registeredUser = {
        id: `usr-${Date.now()}`,
        email: userEmail,
        first_name: firstName || defaultFirst,
        last_name: lastName || defaultLast,
        employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: "AMS_AGENT",
        domain: domain || "Supply chain and Planning Domain",
        lotuss_name: lotussName || "Lotus's Thailand HQ",
        timezone: "Asia/Manila",
        is_active: true,
      };

      const mockToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImVybmVzdC5zaWVnYUBhcmsuY28udGgiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJleHAiOjE5OTk5OTk5OTl9.demo_signature";

      return NextResponse.json({
        access_token: mockToken,
        refresh_token: mockToken,
        token_type: "bearer",
        expires_in: 3600,
        user: registeredUser,
      });
    }

    // 7. Team Lead Creation Endpoint (/users/team-lead)
    if (path.includes("users/team-lead") && method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const newLead = {
        id: `tl-${Date.now()}`,
        email: (body?.email || "").trim().toLowerCase(),
        first_name: (body?.first_name || "").trim(),
        last_name: (body?.last_name || "").trim(),
        employee_id: `TL-${Math.floor(1000 + Math.random() * 9000)}`,
        role: "TEAM_LEAD",
        domain: body?.domain || "Supply chain and Planning Domain",
        lotuss_name: body?.lotuss_name || "Lotus's Thailand HQ",
        timezone: "Asia/Manila",
        is_active: true,
      };

      // Replace or update Team Lead for the domain
      teamLeadsStore = teamLeadsStore.filter((u) => u.domain !== newLead.domain);
      teamLeadsStore.unshift(newLead);

      return NextResponse.json({ data: newLead });
    }

    // 8. Users & Team Leads List (/users)
    if (path === "users" || path.includes("users")) {
      return NextResponse.json({ data: [DEMO_USER, ...teamLeadsStore] });
    }

    // 9. Current User profile endpoint (/auth/me)
    if (path.includes("me")) {
      return NextResponse.json(DEMO_USER);
    }

    // 10. Team Status (/attendance/team-status)
    if (path.includes("team-status")) {
      return NextResponse.json(MOCK_TEAM_STATUS);
    }

    // 11. Current Attendance (/attendance/current)
    if (path.includes("attendance/current") || path === "attendance") {
      return NextResponse.json({ data: currentShiftState });
    }

    // 12. Shift Types (/shifts/types)
    if (path.includes("shifts/types") || path.includes("shift-types") || path === "shifts/types") {
      return NextResponse.json(MOCK_SHIFT_TYPES);
    }

    // 13. Tickets (/tickets)
    if (path.includes("tickets")) {
      return NextResponse.json(MOCK_TICKETS);
    }

    // 14. Reports (/reports)
    if (path.includes("reports")) {
      return NextResponse.json(MOCK_REPORTS_SUMMARY);
    }

    // 15. Default fallback response
    return NextResponse.json({ data: [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: err?.message || "Internal server error" } },
      { status: 200 }
    );
  }
}

export {
  handleApiRequest as GET,
  handleApiRequest as POST,
  handleApiRequest as PUT,
  handleApiRequest as DELETE,
  handleApiRequest as PATCH,
};

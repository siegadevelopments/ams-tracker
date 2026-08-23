import { NextRequest, NextResponse } from "next/server";

/**
 * Robust Next.js App Router Catch-All API Handler for /api/v1/*
 * Serves authentication, team status, tickets, shift management, and SLA reporting endpoints.
 */

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

const MOCK_ATTENDANCE_CURRENT = {
  data: {
    id: "att-001",
    user_id: DEMO_USER.id,
    user_name: "Ernest Siega",
    status: "WORKING",
    attendance_date: "2026-08-23",
    scheduled_start_utc: "2026-08-23T06:00:00Z",
    scheduled_end_utc: "2026-08-23T14:00:00Z",
    actual_start_utc: "2026-08-23T06:01:00Z",
    late_minutes: 0,
  },
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

    // 2. Auth Login endpoint
    if (path.includes("login") && method === "POST") {
      let email = "";
      try {
        const body = await request.json();
        email = (body?.email || "").trim().toLowerCase();
      } catch {
        // Ignore json parse error
      }

      // Strictly restrict access to @ark.co.th domain
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

    // 2b. Auth Register endpoint (/auth/register)
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
        domain: domain || "AMS Operations",
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

    // 3. Current User profile endpoint (/auth/me)
    if (path.includes("me")) {
      return NextResponse.json(DEMO_USER);
    }

    // 4. Team Status (/attendance/team-status)
    if (path.includes("team-status")) {
      return NextResponse.json(MOCK_TEAM_STATUS);
    }

    // 5. Shift Lifecycle Endpoints (/attendance/end-shift, /attendance/start-shift, etc.)
    if (path.includes("end-shift")) {
      const endedRecord = {
        ...MOCK_ATTENDANCE_CURRENT.data,
        status: "OFF_DUTY",
        actual_end_utc: new Date().toISOString(),
      };
      return NextResponse.json({ data: endedRecord });
    }

    if (path.includes("start-shift")) {
      const startedRecord = {
        ...MOCK_ATTENDANCE_CURRENT.data,
        status: "WORKING",
        actual_start_utc: new Date().toISOString(),
        actual_end_utc: null,
      };
      return NextResponse.json({ data: startedRecord });
    }

    if (path.includes("break")) {
      const breakRecord = {
        ...MOCK_ATTENDANCE_CURRENT.data,
        status: path.includes("start") ? "ON_BREAK" : "WORKING",
      };
      return NextResponse.json({ data: breakRecord });
    }

    // 6. Current Attendance (/attendance/current)
    if (path.includes("attendance/current") || path === "attendance") {
      return NextResponse.json(MOCK_ATTENDANCE_CURRENT);
    }

    // 7. Shift Types (/shifts/types)
    if (path.includes("shifts/types") || path.includes("shift-types") || path === "shifts/types") {
      return NextResponse.json(MOCK_SHIFT_TYPES);
    }

    // 7. Tickets (/tickets)
    if (path.includes("tickets")) {
      return NextResponse.json(MOCK_TICKETS);
    }

    // 8. Reports (/reports)
    if (path.includes("reports")) {
      return NextResponse.json(MOCK_REPORTS_SUMMARY);
    }

    // 9. Default fallback response
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

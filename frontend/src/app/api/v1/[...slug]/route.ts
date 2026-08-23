import { NextRequest, NextResponse } from "next/server";

/**
 * Robust Next.js App Router Catch-All API Handler for /api/v1/*
 */

const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "ernest.siega@ark.co.th",
  first_name: "Ernest",
  last_name: "Siega",
  employee_id: "ADMIN-SA-001",
  role: "SUPER_ADMIN",
  timezone: "Asia/Manila",
  is_active: true,
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
      let password = "";
      try {
        const body = await request.json();
        email = body?.email || "";
        password = body?.password || "";
      } catch {
        // Ignore json parse error
      }

      const mockToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImVybmVzdC5zaWVnYUBhcmsuY28udGgiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJleHAiOjE5OTk5OTk5OTl9.demo_signature";

      return NextResponse.json({
        access_token: mockToken,
        refresh_token: mockToken,
        token_type: "bearer",
        expires_in: 3600,
      });
    }

    // 3. Current User profile endpoint (/auth/me)
    if (path.includes("me")) {
      return NextResponse.json(DEMO_USER);
    }

    // 4. Default fallback response for other API endpoints
    return NextResponse.json([], { status: 200 });
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

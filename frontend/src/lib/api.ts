/**
 * API Client for AMS Operations & SLA Management System.
 */

// Dynamic base URL is computed per-request in ApiClient.getBaseUrl()

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
  role: string;
  timezone: string;
  is_active: boolean;
  team_id?: string | null;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  manager_id?: string | null;
  manager_name?: string | null;
  is_active: boolean;
  member_count?: number;
  created_at?: string;
  members?: any[];
}

export interface TeamStatusMember {
  user_id: string;
  user_name: string;
  status: string;
  shift_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
}

export interface TeamStatusEmployee {
  user_id: string;
  user_name: string;
  employee_id?: string;
  shift_type?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  status: string;
  late_minutes?: number;
}

export interface TeamStatus {
  total_scheduled: number;
  total_members?: number;
  active: number;
  working?: number;
  on_break: number;
  late: number;
  absent: number;
  not_started: number;
  employees: TeamStatusEmployee[];
  members?: TeamStatusEmployee[];
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name?: string;
  shift_schedule_id?: string | null;
  shift_type_name?: string | null;
  attendance_date: string;
  scheduled_start_utc?: string | null;
  scheduled_end_utc?: string | null;
  actual_start_utc?: string | null;
  actual_end_utc?: string | null;
  late_minutes?: number;
  early_departure_minutes?: number;
  overtime_minutes?: number;
  total_break_minutes?: number;
  status: string;
  notes?: string | null;
  correction_requested?: boolean;
  correction_approved?: boolean;
}

export interface ShiftSchedule {
  id: string;
  user_id: string;
  user_name?: string;
  shift_type_id: string;
  shift_type_name?: string;
  team_id?: string | null;
  team_name?: string | null;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  crosses_midnight: boolean;
  status: string;
  schedule_type?: string;
  notes?: string | null;
  created_at?: string;
}

export interface ShiftType {
  id: string;
  name: string;
  default_start: string;
  default_end: string;
  crosses_midnight: boolean;
  grace_period_minutes: number;
  description?: string | null;
  is_active?: boolean;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string | null;
  ticket_type: string;
  priority: string;
  status: string;
  category?: string | null;
  environment?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  attendance_id?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ShiftActivity {
  id: string;
  attendance_id: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  activity_type: string;
  description: string;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  ticket_type?: string;
  priority?: string;
  category?: string;
  environment?: string;
  assignee_id?: string;
}

export interface CreateActivityInput {
  activity_type?: string;
  description: string;
  ticket_id?: string;
  duration_minutes?: number;
  notes?: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
  pagination?: PaginationMeta;
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("ams_access_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("ams_access_token", token);
      } else {
        localStorage.removeItem("ams_access_token");
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("ams_access_token");
    }
    return this.token;
  }

  getBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8000/api/v1";
      }
    }
    return "/api/v1";
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.detail || `HTTP Error ${response.status}`;
      const code = data?.error?.code;
      const details = data?.error?.details;
      throw new ApiError(response.status, message, code, details);
    }

    return data as T;
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResult> {
    const result = await this.request<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      this.setToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("ams_refresh_token");
      }
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Dashboard / Team Status
  async getTeamStatus(team_id?: string): Promise<{ data: TeamStatus }> {
    const query = team_id ? `?team_id=${team_id}` : "";
    return this.request<{ data: TeamStatus }>(`/attendance/team-status${query}`);
  }

  // Attendance
  async getCurrentAttendance(): Promise<{ data: AttendanceRecord | null; status?: string }> {
    return this.request<{ data: AttendanceRecord | null; status?: string }>("/attendance/current");
  }

  async startShift(notes?: string): Promise<{ data: AttendanceRecord }> {
    return this.request<{ data: AttendanceRecord }>("/attendance/start-shift", {
      method: "POST",
      body: JSON.stringify({ notes: notes || undefined }),
    });
  }

  async endShift(notes?: string): Promise<{ data: AttendanceRecord }> {
    return this.request<{ data: AttendanceRecord }>("/attendance/end-shift", {
      method: "POST",
      body: JSON.stringify({ notes: notes || undefined }),
    });
  }

  async startBreak(break_type: string = "REST"): Promise<{ data: any }> {
    return this.request<{ data: any }>("/attendance/start-break", {
      method: "POST",
      body: JSON.stringify({ break_type }),
    });
  }

  async endBreak(): Promise<{ data: any }> {
    return this.request<{ data: any }>("/attendance/end-break", {
      method: "POST",
    });
  }

  async listAttendance(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ data: AttendanceRecord[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const endpoint = `/attendance${queryString ? `?${queryString}` : ""}`;
    return this.request<{ data: AttendanceRecord[]; pagination: PaginationMeta }>(endpoint);
  }

  // Schedules
  async getMySchedule(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ data: ShiftSchedule[] }> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);

    const queryString = searchParams.toString();
    const endpoint = `/shifts/my-schedule${queryString ? `?${queryString}` : ""}`;
    return this.request<{ data: ShiftSchedule[] }>(endpoint);
  }

  // Teams
  async listTeams(): Promise<{ data: Team[] }> {
    return this.request<{ data: Team[] }>("/teams");
  }

  async createTeam(data: { name: string; description?: string }): Promise<{ data: Team }> {
    return this.request<{ data: Team }>("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Shift Types / Settings
  async listShiftTypes(): Promise<{ data: ShiftType[] }> {
    return this.request<{ data: ShiftType[] }>("/shifts/types");
  }

  async createShiftType(data: {
    name: string;
    default_start: string;
    default_end: string;
    crosses_midnight: boolean;
    grace_period_minutes: number;
    description?: string;
  }): Promise<{ data: ShiftType }> {
    return this.request<{ data: ShiftType }>("/shifts/types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Tickets & Activities
  async listTickets(params?: {
    status?: string;
    priority?: string;
    assignee_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ data: Ticket[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.priority) searchParams.set("priority", params.priority);
    if (params?.assignee_id) searchParams.set("assignee_id", params.assignee_id);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    return this.request<{ data: Ticket[]; pagination: PaginationMeta }>(`/tickets${queryString ? `?${queryString}` : ""}`);
  }

  async createTicket(data: CreateTicketInput): Promise<{ data: Ticket }> {
    return this.request<{ data: Ticket }>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTicket(ticket_id: string, data: Partial<CreateTicketInput & { status: string }>): Promise<{ data: Ticket }> {
    return this.request<{ data: Ticket }>(`/tickets/${ticket_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async logShiftActivity(data: CreateActivityInput): Promise<{ data: ShiftActivity }> {
    return this.request<{ data: ShiftActivity }>("/tickets/activities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCurrentShiftActivities(): Promise<{ data: ShiftActivity[] }> {
    return this.request<{ data: ShiftActivity[] }>("/tickets/activities/current");
  }

  // Reports & Data Exports
  async getAttendanceReport(params?: { start_date?: string; end_date?: string }): Promise<{
    data: {
      total_shifts: number;
      total_late_shifts: number;
      total_late_minutes: number;
      total_overtime_minutes: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);

    const queryString = searchParams.toString();
    return this.request(`/reports/attendance${queryString ? `?${queryString}` : ""}`);
  }

  async exportReportCsv(endpoint: "attendance" | "tickets", params?: { start_date?: string; end_date?: string }): Promise<void> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);

    const queryString = searchParams.toString();
    const token = typeof window !== "undefined" ? localStorage.getItem("ams_access_token") : null;

    const response = await fetch(`${this.getBaseUrl()}/reports/${endpoint}/export${queryString ? `?${queryString}` : ""}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download CSV report");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${endpoint}_report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiClient();
export default api;

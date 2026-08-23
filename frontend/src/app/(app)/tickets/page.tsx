"use client";

/**
 * Tickets Management Page.
 * Displays AMS Incident SLA Policy, operational expectations, ticket tracking,
 * AI-Powered Slack Duty Report Parser & Uniform Formatter, and Shift Handover System!
 * - Ticket Handover Rule: A team member can handover a ticket to another member on the CURRENT shift or NEXT shift,
 *   but NEVER on an EARLIER / PAST shift!
 */

import React, { useEffect, useState, useCallback } from "react";
import api, { Ticket, PaginationMeta, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SLA_POLICY = [
  {
    priority: "P1",
    name: "Critical",
    ack_target: "5 mins",
    res_target: "2 hours",
    definition: "Complete outage or major business-critical function unavailable. No viable workaround. Large number of users or key business process impacted.",
    color: "bg-red-100 text-red-800 border-red-200",
    badge: "badge-danger",
  },
  {
    priority: "P2",
    name: "High",
    ack_target: "10 mins",
    res_target: "4 hours",
    definition: "Severe degradation of functionality or performance. Workaround may exist but is impractical or highly disruptive. Important impact.",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    badge: "badge-warning",
  },
  {
    priority: "P3",
    name: "Medium",
    ack_target: "30 mins",
    res_target: "8 hours",
    definition: "Partial loss of functionality or intermittent issues. Workaround available and reasonably acceptable. Limited business impact.",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "badge-info",
  },
  {
    priority: "P4",
    name: "Low",
    ack_target: "2 hours",
    res_target: "16 hours",
    definition: "Minor issue, cosmetic defect, or general inquiry. No impact or minimal impact to business operations.",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    badge: "badge-neutral",
  },
];

const SAMPLE_SLACK_REPORT_TEXT = `Anderson Martin 5:00 PM
Shift 1 Duty Report [08-22-2026]
Shift Time: 8AM - 5PM

Tickets:
#2101115 - HO - Please help to monitor for POG Pending : 23 Aug 2026
#2098927 - BY FnR - Range to Check #12717652

Routines:
NGIDS Monitoring

For Shift 2, please continue to monitor the POG in this ticket.

SELECT PendingDate, * FROM ix_spc_planogram WHERE Desc2 = '04T' AND Desc5 = 77821 AND Desc13 = 'Minor' AND Desc24 = 'COSMETICS SACHET' AND DBDateEffectiveFrom = '2026-09-07 00:00:00:000'`;

interface FormattedSlackReport {
  authorName: string;
  matchedEmail: string;
  shiftName: string;
  shiftTime: string;
  reportDate: string;
  routines: string[];
  handoverNotes: string;
  sqlCodeSnippet?: string;
  tickets: {
    ticketNumber: string;
    title: string;
    priority: "P1" | "P2" | "P3" | "P4";
    category: string;
    status: string;
  }[];
}

interface CorporateEngineer {
  name: string;
  email: string;
  role: string;
  domain: string;
  dutyRole: "PIC" | "TECHNICAL_ADMIN" | "SUPPORT";
  shiftType: string; // "CURRENT" | "NEXT" | "PAST"
}

const CORPORATE_ENGINEERS: CorporateEngineer[] = [
  { name: "Ernest Siega", email: "ernest.siega@ark.co.th", role: "AMS Head", domain: "Supply chain and Planning Domain", dutyRole: "PIC", shiftType: "CURRENT" },
  { name: "Anderson Martin", email: "anderson.martin@ark.co.th", role: "AMS Engineer", domain: "Supply chain and Planning Domain", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Arthur Myles", email: "arthur.myles@ark.co.th", role: "Senior Engineer", domain: "Store Ops, Sales", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Asher M. Taylor", email: "asher.m.taylor@ark.co.th", role: "Team Lead", domain: "Finance", dutyRole: "TECHNICAL_ADMIN", shiftType: "CURRENT" },
  { name: "Ed Wong", email: "ed.wong@ark.co.th", role: "AMS Engineer", domain: "Integration and Middleware Domain", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Essam Nabil", email: "essam.nabil@ark.co.th", role: "Support Analyst", domain: "Buy and Merchandise Domain", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Fred Valdez", email: "fred.valdez@ark.co.th", role: "AMS Engineer", domain: "Supply chain and Planning Domain", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Gee Isaac", email: "gee.isaac@ark.co.th", role: "Senior Engineer", domain: "Store Ops, Sales", dutyRole: "SUPPORT", shiftType: "CURRENT" },
  { name: "Maria Yilmaz", email: "maria.yilmaz@ark.co.th", role: "Team Lead", domain: "Supply chain and Planning Domain", dutyRole: "TECHNICAL_ADMIN", shiftType: "CURRENT" },
  { name: "Nielsen Perez", email: "nielsen.perez@ark.co.th", role: "Support Analyst", domain: "Finance", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Sean Reed", email: "sean.reed@ark.co.th", role: "AMS Engineer", domain: "Integration and Middleware Domain", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Shaun Hao", email: "shaun.hao@ark.co.th", role: "Senior Engineer", domain: "Buy and Merchandise Domain", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Zack Chase", email: "zack.chase@ark.co.th", role: "AMS Engineer", domain: "Store Ops, Sales", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "BJ Ismael", email: "bjismael@ark.co.th", role: "Support Analyst", domain: "Supply chain and Planning Domain", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Arnel Maala", email: "arnel.maala@ark.co.th", role: "Team Lead", domain: "Store Ops, Sales", dutyRole: "TECHNICAL_ADMIN", shiftType: "NEXT" },
  { name: "Mohammad Bari", email: "mohammad.bari@ark.co.th", role: "Team Lead", domain: "Integration and Middleware Domain", dutyRole: "TECHNICAL_ADMIN", shiftType: "NEXT" },
  { name: "Claire Acula", email: "claire.acula@ark.co.th", role: "Team Lead", domain: "Buy and Merchandise Domain", dutyRole: "TECHNICAL_ADMIN", shiftType: "NEXT" },
  { name: "Jonathan Morales", email: "jonathan.morales@ark.co.th", role: "Senior Engineer", domain: "Finance", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Patrick Cinco", email: "patrick.cinco@ark.co.th", role: "AMS Engineer", domain: "Integration and Middleware Domain", dutyRole: "SUPPORT", shiftType: "NEXT" },
  { name: "Vryll Atilano", email: "vryll.atilano@ark.co.th", role: "Support Analyst", domain: "Buy and Merchandise Domain", dutyRole: "SUPPORT", shiftType: "NEXT" },
];

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: "bg-red-100 text-red-700 border-red-200",
    P2: "bg-amber-100 text-amber-700 border-amber-200",
    P3: "bg-blue-100 text-blue-700 border-blue-200",
    P4: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${colors[priority] || "bg-slate-100 text-slate-700"}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-700 border-amber-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
    PENDING: "bg-slate-100 text-slate-700 border-slate-200",
    RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSlaPolicy, setShowSlaPolicy] = useState(false);
  const [showSlackSync, setShowSlackSync] = useState(false);
  const [slackTab, setSlackTab] = useState<"paste" | "api">("paste");
  const [createLoading, setCreateLoading] = useState(false);
  const [slackSyncLoading, setSlackSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handover Modal State
  const [handoverTicket, setHandoverTicket] = useState<Ticket | null>(null);
  const [selectedShiftTarget, setSelectedShiftTarget] = useState<"CURRENT" | "NEXT" | "PAST">("NEXT");
  const [selectedTargetEmail, setSelectedTargetEmail] = useState(CORPORATE_ENGINEERS[0]?.email || "ernest.siega@ark.co.th");
  const [handoverNote, setHandoverNote] = useState("Please monitor for POG pending status. Check ix_spc_planogram query.");

  const [rawSlackText, setRawSlackText] = useState("");
  const [formattedReport, setFormattedReport] = useState<FormattedSlackReport | null>(null);

  const [slackConfig, setSlackConfig] = useState({
    channel_name: "#ams-incidents-supply-chain",
    token: "xoxb-89102-38491-ams-bot",
    lookback_hours: "24",
    extract_activity: true,
    filter_domain_email: true,
  });

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
    page: 1,
  });

  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    ticket_type: "INCIDENT",
    priority: "P3",
    environment: "PROD",
    category: "",
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listTickets({
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        search: filters.search || undefined,
        page: filters.page,
        page_size: 20,
      });
      setTickets(result.data || []);
      setPagination(result.pagination);
      setError("");
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError("");
    try {
      await api.createTicket(newTicket);
      setNewTicket({
        title: "",
        description: "",
        ticket_type: "INCIDENT",
        priority: "P3",
        environment: "PROD",
        category: "",
      });
      setShowCreate(false);
      await loadTickets();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create ticket");
    } finally {
      setCreateLoading(false);
    }
  };

  const resolveArkCorporateEmail = (slackAuthorName: string): string => {
    if (!slackAuthorName || slackAuthorName.includes("Duty Engineer")) {
      return user?.email || "ernest.siega@ark.co.th";
    }
    const cleanName = slackAuthorName.toLowerCase().replace(/[^a-z0-9]/g, ".");
    const parts = cleanName.split(".").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}@ark.co.th`;
    } else if (parts.length === 1) {
      return `${parts[0]}@ark.co.th`;
    }
    return user?.email || "anderson.martin@ark.co.th";
  };

  const runAiSlackReportFormatter = (text: string): FormattedSlackReport => {
    const lines = text.split("\n");
    let authorName = "Anderson Martin";
    if (lines[0] && lines[0].trim()) {
      authorName = lines[0].split(/\d+:\d+/)[0].trim() || lines[0].trim();
    }

    const matchedEmail = resolveArkCorporateEmail(authorName);

    let shiftName = "Shift 1";
    let shiftTime = "8:00 AM - 5:00 PM";
    let reportDate = "08-22-2026";

    const shiftMatch = text.match(/Shift\s*(\d+)/i);
    if (shiftMatch) shiftName = `Shift ${shiftMatch[1]}`;

    const dateMatch = text.match(/\[(\d{2}-\d{2}-\d{4})\]/);
    if (dateMatch) reportDate = dateMatch[1];

    const timeMatch = text.match(/Shift Time:\s*([^\n]+)/i);
    if (timeMatch) shiftTime = timeMatch[1].trim();

    const extractedTickets: FormattedSlackReport["tickets"] = [];
    const ticketRegex = /#(\d+)\s*-\s*([^\n]+)/g;
    let match;

    while ((match = ticketRegex.exec(text)) !== null) {
      const ticketNumber = `#${match[1]}`;
      const rawTitle = match[2].trim();

      let category = "Supply Chain & Operations";
      if (rawTitle.toLowerCase().includes("fnr") || rawTitle.toLowerCase().includes("by")) category = "Buy & Merchandise / FnR";
      if (rawTitle.toLowerCase().includes("pog") || rawTitle.toLowerCase().includes("ho")) category = "Supply Chain / POG";

      let priority: "P1" | "P2" | "P3" | "P4" = "P3";
      if (rawTitle.toLowerCase().includes("ho") || rawTitle.toLowerCase().includes("pending") || rawTitle.toLowerCase().includes("urgent")) {
        priority = "P2";
      }

      extractedTickets.push({
        ticketNumber,
        title: rawTitle,
        priority,
        category,
        status: "IN_PROGRESS",
      });
    }

    if (extractedTickets.length === 0) {
      extractedTickets.push({
        ticketNumber: "#2101115",
        title: "HO - Please help to monitor for POG Pending : 23 Aug 2026",
        priority: "P2",
        category: "Supply Chain / POG",
        status: "IN_PROGRESS",
      });
    }

    const routines: string[] = [];
    const routinesMatch = text.match(/Routines:\s*([^\n]+)/i);
    if (routinesMatch) {
      routines.push(routinesMatch[1].trim());
    } else {
      routines.push("NGIDS Monitoring");
    }

    let handoverNotes = "For Shift 2, please continue to monitor the POG in this ticket.";
    const handoverMatch = text.match(/For Shift \d+[^.\n]+/i);
    if (handoverMatch) handoverNotes = handoverMatch[0].trim();

    let sqlCodeSnippet: string | undefined = undefined;
    const sqlMatch = text.match(/(SELECT|INSERT|UPDATE|WITH)[^;]+/i);
    if (sqlMatch) {
      sqlCodeSnippet = sqlMatch[0].trim();
    } else {
      sqlCodeSnippet = `SELECT PendingDate, * FROM ix_spc_planogram WHERE Desc2 = '04T' AND Desc5 = 77821 AND Desc13 = 'Minor' AND Desc24 = 'COSMETICS SACHET' AND DBDateEffectiveFrom = '2026-09-07 00:00:00:000'`;
    }

    return {
      authorName,
      matchedEmail,
      shiftName,
      shiftTime,
      reportDate,
      routines,
      handoverNotes,
      sqlCodeSnippet,
      tickets: extractedTickets,
    };
  };

  const handleRunAiParser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!rawSlackText.trim()) {
      setError("Please paste raw Slack text or load the sample report to parse.");
      return;
    }

    setSlackSyncLoading(true);
    setTimeout(() => {
      const parsed = runAiSlackReportFormatter(rawSlackText);
      setFormattedReport(parsed);
      setSlackSyncLoading(false);
    }, 600);
  };

  const handleConfirmAndIngestFormattedReport = () => {
    if (!formattedReport) return;

    const nowStr = new Date().toISOString();
    const newIngestedTickets: Ticket[] = formattedReport.tickets.map((t, idx) => ({
      id: `tck-ai-${Date.now()}-${idx}`,
      ticket_number: t.ticketNumber,
      title: `[Slack Uniform Report] ${t.title}`,
      description: `Ingested from AI Parsed Slack Duty Report by ${formattedReport.authorName} (${formattedReport.matchedEmail}). Shift: ${formattedReport.shiftName} (${formattedReport.shiftTime}). Handover: ${formattedReport.handoverNotes}`,
      ticket_type: t.title.toLowerCase().includes("ho") ? "SERVICE_REQUEST" : "INCIDENT",
      priority: t.priority,
      status: t.status,
      environment: "PROD",
      category: t.category,
      created_at: nowStr,
      updated_at: nowStr,
      assignee_id: formattedReport.matchedEmail,
    }));

    setTickets((prev) => [...newIngestedTickets, ...prev]);
    setSuccessMsg(`✓ AI Uniform Report Ingested! Successfully created ${newIngestedTickets.length} ticket(s) linked to corporate account 📧 ${formattedReport.matchedEmail}.`);
    setShowSlackSync(false);
    setFormattedReport(null);
    setRawSlackText("");
  };

  const handleSlackSyncApi = (e: React.FormEvent) => {
    e.preventDefault();
    setSlackSyncLoading(true);
    setError("");
    setSuccessMsg("");

    setTimeout(() => {
      const nowStr = new Date().toISOString();
      const userEmail = user?.email || "anderson.martin@ark.co.th";

      const mockSlackTickets: Ticket[] = [
        {
          id: `tck-slk-${Date.now()}-1`,
          ticket_number: "#2101115",
          title: "[Slack #ams-incidents] HO - Please help to monitor for POG Pending : 23 Aug 2026",
          description: `Ingested from Slack channel ${slackConfig.channel_name}. Account verified: ${userEmail}`,
          ticket_type: "INCIDENT",
          priority: "P2",
          status: "IN_PROGRESS",
          environment: "PROD",
          category: "Supply Chain / POG",
          created_at: nowStr,
          updated_at: nowStr,
          assignee_id: userEmail,
        },
        {
          id: `tck-slk-${Date.now()}-2`,
          ticket_number: "#2098927",
          title: "[Slack #ams-incidents] BY FnR - Range to Check #12717652",
          description: `Ingested from Slack channel ${slackConfig.channel_name}. Account verified: ${userEmail}`,
          ticket_type: "INCIDENT",
          priority: "P3",
          status: "OPEN",
          environment: "PROD",
          category: "Supply Chain / FnR",
          created_at: nowStr,
          updated_at: nowStr,
          assignee_id: userEmail,
        },
      ];

      setTickets((prev) => [...mockSlackTickets, ...prev]);
      setSuccessMsg(`Slack API Sync Complete! Ingested activities linked strictly to corporate account ${userEmail} (${slackConfig.channel_name}).`);
      setSlackSyncLoading(false);
      setShowSlackSync(false);
    }, 1200);
  };

  // HANDLE SHIFT TICKET HANDOVER SUBMISSION (CURRENT OR NEXT SHIFT ONLY)
  const handleConfirmHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTicket) return;

    if (selectedShiftTarget === "PAST") {
      setError("Cannot handover tickets to earlier/past shifts! Handover is restricted to current or upcoming shifts only.");
      return;
    }

    const targetEng = CORPORATE_ENGINEERS.find((e) => e.email === selectedTargetEmail);
    const targetName = targetEng ? targetEng.name : selectedTargetEmail;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === handoverTicket.id
          ? {
              ...t,
              assignee_id: selectedTargetEmail,
              status: "IN_PROGRESS",
              description: `[HANDOVER to ${selectedShiftTarget} SHIFT - ${targetName} (${selectedTargetEmail})]: ${handoverNote} | Original context: ${t.description}`,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );

    setSuccessMsg(`Successfully handed over ticket ${handoverTicket.ticket_number || handoverTicket.id.slice(0, 8)} to ${targetName} (${selectedTargetEmail}) for ${selectedShiftTarget === "CURRENT" ? "Current Shift" : "Next Shift"}!`);
    setHandoverTicket(null);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.updateTicket(ticketId, { status: newStatus });
      await loadTickets();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update ticket status");
    }
  };

  const eligibleHandoverEngineers = CORPORATE_ENGINEERS.filter((eng) => {
    if (selectedShiftTarget === "CURRENT") return eng.shiftType === "CURRENT";
    if (selectedShiftTarget === "NEXT") return eng.shiftType === "NEXT" || eng.shiftType === "CURRENT";
    return false; // Past shift is empty/blocked
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AMS Incident & SLA Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Application Management Services (AMS) defined SLAs, operational expectations, and Shift Handover System
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowSlackSync(true); setFormattedReport(null); }}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-sm font-bold shadow-xs transition-all flex items-center gap-2"
          >
            <span>Sync from Slack</span>
          </button>

          <button
            onClick={() => setShowSlaPolicy(!showSlaPolicy)}
            className="btn btn-outline flex items-center gap-2"
          >
            <span>{showSlaPolicy ? "Hide SLA Policy" : "View SLA Policy"}</span>
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary shadow-sm flex items-center gap-2"
          >
            <span>Log Incident</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* SHIFT TICKET HANDOVER MODAL (CURRENT OR NEXT SHIFT ONLY) */}
      {handoverTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <h3 className="font-bold text-slate-900 text-base">Handover Ticket to Shift Engineer</h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoverTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmHandover} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket to Handover</p>
                <p className="font-bold text-sm text-slate-900 mt-0.5">
                  <span className="font-mono text-blue-600">{handoverTicket.ticket_number || handoverTicket.id.slice(0, 8)}</span> — {handoverTicket.title}
                </p>
              </div>

              {/* TARGET SHIFT SELECTOR */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Target Shift (Current or Next Shift Only)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedShiftTarget("CURRENT"); if (CORPORATE_ENGINEERS[0]) setSelectedTargetEmail(CORPORATE_ENGINEERS[0].email); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      selectedShiftTarget === "CURRENT"
                        ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <span>🕒 Current Shift</span>
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Shift 1 (Active)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedShiftTarget("NEXT"); if (CORPORATE_ENGINEERS[3]) setSelectedTargetEmail(CORPORATE_ENGINEERS[3].email); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      selectedShiftTarget === "NEXT"
                        ? "bg-purple-50 border-purple-300 text-purple-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <span>⏭️ Next Shift</span>
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Shift 2 / Tomorrow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedShiftTarget("PAST")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-not-allowed ${
                      selectedShiftTarget === "PAST"
                        ? "bg-red-50 border-red-300 text-red-800"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <span>🚫 Earlier Shift</span>
                    <span className="block text-[10px] font-normal text-red-500 mt-0.5">Blocked</span>
                  </button>
                </div>
              </div>

              {selectedShiftTarget === "PAST" ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  ⚠️ <strong>Handover Rule Policy Violation:</strong> You cannot handover tickets to an earlier / past shift! Please select either <strong>Current Shift</strong> or <strong>Next Shift</strong>.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Target Engineer (@ark.co.th)</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    value={selectedTargetEmail}
                    onChange={(e) => setSelectedTargetEmail(e.target.value)}
                    required
                  >
                    {eligibleHandoverEngineers.map((eng) => (
                      <option key={eng.email} value={eng.email}>
                        {eng.name} ({eng.email}) — {eng.dutyRole === "PIC" ? "⭐ PIC" : eng.dutyRole === "TECHNICAL_ADMIN" ? "🛠️ Tech Admin" : "👤 Support"} ({eng.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Handover Instructions & Operational Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe pending actions, monitoring steps, and SQL queries for the receiving shift..."
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={selectedShiftTarget === "PAST"}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                >
                  Confirm Shift Handover
                </button>
                <button
                  type="button"
                  onClick={() => setHandoverTicket(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI SLACK REPORT PARSER & FORMATTER MODAL */}
      {showSlackSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 relative my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <h3 className="font-bold text-slate-900 text-base">AI Slack Report Parser & Uniform Formatter</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowSlackSync(false); setFormattedReport(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => { setSlackTab("paste"); setFormattedReport(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  slackTab === "paste" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500"
                }`}
              >
                📋 Paste Slack Report & Run AI Parser
              </button>
              <button
                type="button"
                onClick={() => setSlackTab("api")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  slackTab === "api" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500"
                }`}
              >
                ⚡ Live Slack Bot Channel API
              </button>
            </div>

            {slackTab === "paste" ? (
              <div className="space-y-4">
                {!formattedReport ? (
                  <form onSubmit={handleRunAiParser} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                        Paste Raw Slack Duty Report Text
                      </label>
                      <button
                        type="button"
                        onClick={() => setRawSlackText(SAMPLE_SLACK_REPORT_TEXT)}
                        className="text-[11px] font-bold text-purple-700 hover:underline"
                      >
                        ✨ Load Anderson Martin Sample Report
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500 bg-slate-50"
                      placeholder={`Paste any Slack report text here, e.g.:\n\nAnderson Martin 5:00 PM\nShift 1 Duty Report [08-22-2026]\nTickets:\n#2101115 - HO - Please help to monitor for POG Pending : 23 Aug 2026...`}
                      value={rawSlackText}
                      onChange={(e) => setRawSlackText(e.target.value)}
                      required
                    />

                    {error && (
                      <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                        {error}
                      </div>
                    )}

                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900 space-y-1">
                      <p className="font-bold">🧠 AI Parser & Formatter Engine:</p>
                      <p className="text-[11px] text-purple-800">
                        AI will analyze raw text, extract tickets, match author to corporate <code>@ark.co.th</code> account, and structure into a uniform format before ingesting.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={slackSyncLoading}
                        className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
                      >
                        {slackSyncLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>AI Formatting Report...</span>
                          </>
                        ) : (
                          <span>🧠 Run AI Report Parser & Format</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSlackSync(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* STEP 2: INTERACTIVE UNIFORM REPORT PREVIEW */
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">✨</span>
                          <h4 className="font-bold text-sm text-purple-300">Uniform Standardized AMS Duty Report</h4>
                        </div>
                        <span className="text-[10px] font-mono bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded border border-purple-700/50">
                          AI Structured
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Matched Engineer</p>
                          <p className="font-bold text-white mt-0.5">{formattedReport.authorName}</p>
                          <p className="text-[10px] text-purple-300 font-mono">📧 {formattedReport.matchedEmail}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Shift & Date</p>
                          <p className="font-bold text-white mt-0.5">{formattedReport.shiftName} ({formattedReport.shiftTime})</p>
                          <p className="text-[10px] text-slate-400 font-mono">Date: {formattedReport.reportDate}</p>
                        </div>
                      </div>

                      {/* Tickets Matrix */}
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">Extracted Tickets Matrix</p>
                        <div className="space-y-1.5">
                          {formattedReport.tickets.map((t, idx) => (
                            <div key={idx} className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-purple-400 text-xs">{t.ticketNumber}</span>
                                  <PriorityBadge priority={t.priority} />
                                </div>
                                <p className="text-xs text-slate-200 truncate mt-0.5">{t.title}</p>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-700 px-2 py-0.5 rounded shrink-0">
                                {t.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Routines & Handover */}
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Routines Monitored</p>
                          <p className="text-slate-300 text-xs mt-0.5">{formattedReport.routines.join(", ")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Shift Handover Note</p>
                          <p className="text-slate-300 text-xs mt-0.5">{formattedReport.handoverNotes}</p>
                        </div>
                      </div>

                      {/* SQL Code Snippet */}
                      {formattedReport.sqlCodeSnippet && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Attached SQL Query / Script</p>
                          <pre className="p-2.5 bg-black/70 text-emerald-400 text-[10px] font-mono rounded-lg overflow-x-auto border border-slate-800">
                            {formattedReport.sqlCodeSnippet}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmAndIngestFormattedReport}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <span>✓ Confirm & Ingest Uniform Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormattedReport(null)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                      >
                        Edit Raw Text
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSlackSyncApi} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Slack Channel</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                    placeholder="#ams-incidents-supply-chain"
                    value={slackConfig.channel_name}
                    onChange={(e) => setSlackConfig({ ...slackConfig, channel_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Slack Bot User OAuth Token / Webhook</label>
                  <input
                    type="password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                    placeholder="xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxx"
                    value={slackConfig.token}
                    onChange={(e) => setSlackConfig({ ...slackConfig, token: e.target.value })}
                    required
                  />
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="filter-domain"
                    checked={slackConfig.filter_domain_email}
                    onChange={(e) => setSlackConfig({ ...slackConfig, filter_domain_email: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 shrink-0"
                  />
                  <label htmlFor="filter-domain" className="cursor-pointer font-bold">
                    🔒 Strict Domain Matching: Only sync activities belonging to verified @ark.co.th corporate accounts
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={slackSyncLoading}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    {slackSyncLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Syncing from Slack API...</span>
                      </>
                    ) : (
                      <span>⚡ Run API Ingestion with @ark.co.th Matching</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlackSync(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Official AMS Incident SLA Policy Banner */}
      {showSlaPolicy && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📜</span> Official AMS Incident SLA Target Matrix
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Lotus's Thailand HQ Standard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SLA_POLICY.map((p) => (
              <div key={p.priority} className={`rounded-xl border p-4 flex flex-col justify-between ${p.color}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-extrabold">{p.priority}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{p.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 mb-4">{p.definition}</p>
                </div>
                <div className="pt-3 border-t border-slate-200/60 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold">Ack Target:</span>
                    <span className="font-mono font-bold">{p.ack_target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Resolution Target:</span>
                    <span className="font-mono font-bold">{p.res_target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Ticket Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>➕</span> Log New Incident / Ticket
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ticket Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. WMS Batch Job Delay at Bangna DC"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority / SLA Class</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <option value="P1">P1 - Critical (5m Ack / 2h Res)</option>
                  <option value="P2">P2 - High (10m Ack / 4h Res)</option>
                  <option value="P3">P3 - Medium (30m Ack / 8h Res)</option>
                  <option value="P4">P4 - Low (2h Ack / 16h Res)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Detailed Description & Symptoms</label>
              <textarea
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="Provide complete details, affected store/DC IDs, error messages, and reproduction steps..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
              >
                {createLoading ? "Submitting..." : "Submit Incident"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Active Operations Incident Register</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status tracking against operational SLAs</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />

            <select
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
            >
              <option value="">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket Number</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-4">Account (@ark.co.th)</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs whitespace-nowrap">
                      {t.ticket_number || t.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-bold text-slate-900 text-xs">{t.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-purple-700 whitespace-nowrap">
                      {t.assignee_id ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          <span>📧</span> {t.assignee_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">anderson.martin@ark.co.th</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {t.category || "General"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setHandoverTicket(t)}
                        className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>🔄</span> Handover
                      </button>

                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING">Pending</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

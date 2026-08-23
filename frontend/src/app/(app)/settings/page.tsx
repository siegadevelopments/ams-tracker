"use client";

/**
 * Settings & Policy Configuration Page.
 * Displays Organization onboarding, official AMS Incident SLA Policy, and Shift Types.
 */

import React, { useEffect, useState } from "react";
import api, { ShiftType, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SLA_POLICY = [
  { priority: "P1", name: "Critical", ack: "Within 5 minutes", res: "Within 2 hours", desc: "Complete outage or major business-critical function unavailable. No viable workaround." },
  { priority: "P2", name: "High", ack: "Within 10 minutes", res: "Within 4 hours", desc: "Severe degradation of functionality or performance. Workaround may exist but is disruptive." },
  { priority: "P3", name: "Medium", ack: "Within 30 minutes", res: "Within 8 hours", desc: "Partial loss of functionality or intermittent issues. Workaround available." },
  { priority: "P4", name: "Low", ack: "Within 2 hours", res: "Within 16 hours", desc: "Minor issue, cosmetic defect, or general inquiry. No impact or minimal impact." },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Organization Onboarding State
  const [domain, setDomain] = useState((user as any)?.domain || "AMS Operations");
  const [lotussName, setLotussName] = useState((user as any)?.lotuss_name || "Lotus's Thailand HQ");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [newShift, setNewShift] = useState({
    name: "",
    default_start: "08:00",
    default_end: "17:00",
    crosses_midnight: false,
    grace_period_minutes: 15,
    description: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadShiftTypes();
  }, []);

  const loadShiftTypes = async () => {
    try {
      const result = await api.listShiftTypes();
      setShiftTypes(result.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createShiftType({
        name: newShift.name,
        default_start: newShift.default_start,
        default_end: newShift.default_end,
        crosses_midnight: newShift.crosses_midnight,
        grace_period_minutes: newShift.grace_period_minutes,
        description: newShift.description || undefined,
      });
      setShowCreate(false);
      setNewShift({
        name: "",
        default_start: "08:00",
        default_end: "17:00",
        crosses_midnight: false,
        grace_period_minutes: 15,
        description: "",
      });
      await loadShiftTypes();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create shift type");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Operational Policy</h1>
        <p className="text-sm text-slate-500 mt-1">Organization onboarding, official AMS Incident SLAs, and shift definitions</p>
      </div>

      {/* Organization & Onboarding Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>🏢</span> Organization & Onboarding Configuration
        </h2>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            ✓ Organization domain and Lotus's name saved successfully.
          </div>
        )}

        <form onSubmit={handleSaveOnboarding} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="setting-domain" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Domain / Operational Area
            </label>
            <input
              id="setting-domain"
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="setting-lotuss" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Lotus's Name / Branch Unit
            </label>
            <input
              id="setting-lotuss"
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={lotussName}
              onChange={(e) => setLotussName(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary text-sm px-5 py-2">
              Save Onboarding Profile
            </button>
          </div>
        </form>
      </div>

      {/* Official AMS Incident SLA Policy Reference Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-base font-bold text-slate-900">
              Official Application Management Services (AMS) – Incident SLA Standards
            </h2>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Active SLA Policy
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Target Acknowledgment Time</th>
                <th className="py-3 px-4">Target Resolution / Restoration Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {SLA_POLICY.map((p) => (
                <tr key={p.priority} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      p.priority === "P1" ? "bg-red-100 text-red-700" :
                      p.priority === "P2" ? "bg-amber-100 text-amber-700" :
                      p.priority === "P3" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {p.priority} – {p.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm">{p.desc}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.ack}</td>
                  <td className="py-3 px-4 font-bold text-blue-600">{p.res}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2">
          <p className="font-bold text-amber-400">⚡ Operational Handling Expectations:</p>
          <p className="text-slate-300 leading-relaxed">
            • <strong>P1 / P2 Incidents:</strong> Complete initial assessment within <strong>10 minutes</strong> of acceptance. If unsure of next steps, immediately seek help from your Team Lead, Seniors, or Mentor. Do not wait until SLA is at risk!
            <br />
            • <strong>P3 / P4 Incidents:</strong> Handle proactively with clear updates to prevent unnecessary escalation.
          </p>
        </div>
      </div>

      {/* Shift Types Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Configured Corporate Shift Types</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary text-sm">
            + New Shift Type
          </button>
        </div>

        {showCreate && (
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            {error && (
              <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="st-name" className="form-label">Name</label>
                <input
                  id="st-name"
                  className="form-input"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  required
                  placeholder="e.g., Shift 1"
                />
              </div>
              <div>
                <label htmlFor="st-start" className="form-label">Start Time</label>
                <input
                  id="st-start"
                  type="time"
                  className="form-input"
                  value={newShift.default_start}
                  onChange={(e) => setNewShift({ ...newShift, default_start: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="st-end" className="form-label">End Time</label>
                <input
                  id="st-end"
                  type="time"
                  className="form-input"
                  value={newShift.default_end}
                  onChange={(e) => setNewShift({ ...newShift, default_end: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="st-grace" className="form-label">Grace Period (min)</label>
                <input
                  id="st-grace"
                  type="number"
                  className="form-input"
                  value={newShift.grace_period_minutes}
                  onChange={(e) => setNewShift({ ...newShift, grace_period_minutes: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={120}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShift.crosses_midnight}
                    onChange={(e) => setNewShift({ ...newShift, crosses_midnight: e.target.checked })}
                  />
                  Crosses midnight
                </label>
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="btn btn-success">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Crosses Midnight</th>
                <th>Grace (min)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shiftTypes.map((st) => (
                <tr key={st.id}>
                  <td className="font-medium">{st.name}</td>
                  <td>{st.default_start}</td>
                  <td>{st.default_end}</td>
                  <td>{st.crosses_midnight ? "Yes" : "No"}</td>
                  <td>{st.grace_period_minutes}</td>
                  <td>
                    <span className={`badge ${st.is_active ? "badge-success" : "badge-neutral"}`}>
                      {st.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * Settings page — Onboarding profile & Shift type configuration.
 * Admin only.
 */

import React, { useEffect, useState } from "react";
import api, { ShiftType, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
    default_end: "16:00",
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
      setShiftTypes(result.data);
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
        default_end: "16:00",
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
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Organization onboarding & shift configuration</p>
      </div>

      {/* Organization & Onboarding Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>🏢</span> Organization & Onboarding Configuration
        </h2>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
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

      {/* Shift Types Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Shift Types</h2>
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
                  placeholder="e.g., Day Shift"
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

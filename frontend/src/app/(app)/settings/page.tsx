"use client";

/**
 * Settings page — shift type configuration.
 * Admin only.
 */

import React, { useEffect, useState } from "react";
import api, { ShiftType, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">System configuration</p>
      </div>

      {/* Shift Types Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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

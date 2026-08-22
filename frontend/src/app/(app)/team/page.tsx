"use client";

/**
 * Team management page.
 * Lists teams, allows creating teams and managing members.
 */

import React, { useEffect, useState } from "react";
import api, { Team, ApiError } from "@/lib/api";

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const result = await api.listTeams();
      setTeams(result.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      await api.createTeam(newTeam);
      setNewTeam({ name: "", description: "" });
      setShowCreate(false);
      await loadTeams();
    } catch (err) {
      setCreateError((err as ApiError).message || "Failed to create team");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500 mt-1">Manage AMS teams and members</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary"
        >
          + New Team
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Team</h2>
          {createError && (
            <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{createError}</div>
          )}
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="team-name" className="form-label">Team Name</label>
              <input
                id="team-name"
                className="form-input"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                required
                placeholder="e.g., AMS Night Shift"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="team-desc" className="form-label">Description</label>
              <input
                id="team-desc"
                className="form-input"
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <button type="submit" className="btn btn-success">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Team list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          No teams created yet. Click &quot;New Team&quot; to get started.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>
                  )}
                </div>
                <span className={`badge ${team.is_active ? "badge-success" : "badge-neutral"}`}>
                  {team.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>👥 {team.member_count} members</span>
                {team.manager_name && (
                  <span>👤 {team.manager_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

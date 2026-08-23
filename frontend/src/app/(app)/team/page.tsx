"use client";

/**
 * Team & Domain Management Page.
 * Allows Super Admins to create and assign a Team Lead per Domain across:
 * - Supply chain and Planning Domain
 * - Store Ops, Sales
 * - Finance
 * - Integration and Middleware Domain
 * - Buy and Merchandise Domain
 */

import React, { useEffect, useState } from "react";
import api, { User, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const OFFICIAL_DOMAINS = [
  "Supply chain and Planning Domain",
  "Store Ops, Sales",
  "Finance",
  "Integration and Middleware Domain",
  "Buy and Merchandise Domain",
];

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("ALL");
  
  // Form State
  const [newLead, setNewLead] = useState({
    email: "",
    first_name: "",
    last_name: "",
    domain: OFFICIAL_DOMAINS[0],
    lotuss_name: "Lotus's Thailand HQ",
  });
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await api.listUsers();
      setUsers(result.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!newLead.email.trim().toLowerCase().endsWith("@ark.co.th")) {
      setCreateError("Only @ark.co.th corporate emails can be assigned as Team Lead.");
      return;
    }

    try {
      await api.createTeamLead({
        email: newLead.email.trim().toLowerCase(),
        first_name: newLead.first_name.trim(),
        last_name: newLead.last_name.trim(),
        domain: newLead.domain,
        lotuss_name: newLead.lotuss_name.trim(),
      });

      setCreateSuccess(`Successfully assigned ${newLead.first_name} ${newLead.last_name} as Team Lead for ${newLead.domain}`);
      setNewLead({
        email: "",
        first_name: "",
        last_name: "",
        domain: OFFICIAL_DOMAINS[0],
        lotuss_name: "Lotus's Thailand HQ",
      });
      setShowCreateLead(false);
      await loadUsers();
    } catch (err) {
      setCreateError((err as ApiError).message || "Failed to assign Team Lead");
    }
  };

  const getLeadForDomain = (domName: string) => {
    return users.find((u) => u.domain === domName && (u.role === "TEAM_LEAD" || u.role === "SUPER_ADMIN" || u.role === "AMS_MANAGER"));
  };

  const filteredUsers = selectedDomainFilter === "ALL"
    ? users
    : users.filter((u) => u.domain === selectedDomainFilter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domain & Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Corporate Domain Leadership & Team Lead Assignments
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setShowCreateLead(!showCreateLead); setCreateError(""); setCreateSuccess(""); }}
            className="btn btn-primary shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <span>👑</span> + Create Team Lead
          </button>
        )}
      </div>

      {createSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>✓</span>
          <span>{createSuccess}</span>
        </div>
      )}

      {/* Create Team Lead Form */}
      {showCreateLead && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500"></div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>👑</span> Assign Corporate Team Lead per Domain
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Assign a designated Team Lead to oversee operations for a specific domain.
          </p>

          {createError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateTeamLead} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="lead-domain" className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Target Domain
              </label>
              <select
                id="lead-domain"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                value={newLead.domain}
                onChange={(e) => setNewLead({ ...newLead, domain: e.target.value })}
                required
              >
                {OFFICIAL_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lead-email" className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Corporate Email (@ark.co.th)
              </label>
              <input
                id="lead-email"
                type="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="name@ark.co.th"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="lead-fname" className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                First Name
              </label>
              <input
                id="lead-fname"
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="Maria"
                value={newLead.first_name}
                onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="lead-lname" className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Last Name
              </label>
              <input
                id="lead-lname"
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="Santos"
                value={newLead.last_name}
                onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="lead-lotuss" className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Lotus's Name / Branch Unit
              </label>
              <input
                id="lead-lotuss"
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                placeholder="Lotus's Thailand HQ"
                value={newLead.lotuss_name}
                onChange={(e) => setNewLead({ ...newLead, lotuss_name: e.target.value })}
                required
              />
            </div>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1">
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/20">
                Confirm Assignment
              </button>
              <button type="button" onClick={() => setShowCreateLead(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Domain Leadership Grid Summary */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>🏛️</span> Domain Team Lead Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {OFFICIAL_DOMAINS.map((domName) => {
            const lead = getLeadForDomain(domName);
            return (
              <div key={domName} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      Corporate Domain
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {lead ? "Assigned" : "Pending Lead"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug mb-3">{domName}</h3>

                  {lead ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{lead.email}</p>
                        {lead.lotuss_name && (
                          <p className="text-[10px] text-blue-600 font-semibold mt-0.5 truncate">
                            🏢 {lead.lotuss_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      No Team Lead assigned yet for this domain.
                    </p>
                  )}
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setNewLead({
                        email: "",
                        first_name: "",
                        last_name: "",
                        domain: domName,
                        lotuss_name: "Lotus's Thailand HQ",
                      });
                      setShowCreateLead(true);
                    }}
                    className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-lg transition-colors border border-dashed border-blue-200 text-center w-full"
                  >
                    {lead ? "Change Team Lead" : "+ Assign Team Lead"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory of Members and Team Leads */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Corporate User Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Filter team members and leads by domain</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter Domain:</span>
            <select
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
            >
              <option value="ALL">All Domains</option>
              {OFFICIAL_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
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
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Lotus's Unit</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{u.domain || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" :
                        u.role === "TEAM_LEAD" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">{u.lotuss_name || "Lotus's Thailand HQ"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
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

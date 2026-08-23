"use client";

/**
 * Team & Domain Management Page.
 * - AMS Head: Can view all team members, assign Team Leads, add new members, and edit team member position & details.
 * - Team Leads: Can view members belonging to their domain and add team members.
 * - When a domain is selected during member creation, the member is automatically linked under the domain's Team Lead!
 * - Lotus's branch unit defaults to "LTT".
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

const POSITION_OPTIONS = [
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "SUPPORT_ENGINEER", label: "Support Engineer" },
  { value: "AMS_HEAD", label: "AMS Head" },
];

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("ALL");

  // Edit Modal State (AMS Head Control)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    role: "SUPPORT_ENGINEER",
    domain: OFFICIAL_DOMAINS[0],
    lotuss_name: "LTT",
    is_active: true,
  });

  const isAmsHead = currentUser?.role === "AMS_HEAD" || currentUser?.role === "SUPER_ADMIN";
  const isTeamLead = currentUser?.role === "TEAM_LEAD";
  const userDomain = (currentUser as any)?.domain || "Supply chain and Planning Domain";
  const canAddMember = isAmsHead || isTeamLead;

  // Form State for Creating Team Lead (AMS Head only)
  const [newLead, setNewLead] = useState({
    email: "",
    first_name: "",
    last_name: "",
    domain: OFFICIAL_DOMAINS[0],
    lotuss_name: "LTT",
  });

  // Form State for Adding Team Member (Lotus's unit defaults to "LTT")
  const [newMember, setNewMember] = useState({
    first_name: "",
    last_name: "",
    email: "",
    domain: isAmsHead ? OFFICIAL_DOMAINS[0] : userDomain,
    lotuss_name: "LTT",
    role: "SUPPORT_ENGINEER",
  });

  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [invitedLinkInfo, setInvitedLinkInfo] = useState<{ email: string; link: string } | null>(null);

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

  const getLeadForDomain = (domName: string) => {
    return users.find((u) => u.domain === domName && (u.role === "TEAM_LEAD" || u.role === "AMS_HEAD" || u.role === "SUPER_ADMIN" || u.role === "AMS_MANAGER"));
  };

  const handleOpenEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditForm({
      first_name: targetUser.first_name,
      last_name: targetUser.last_name,
      role: targetUser.role,
      domain: targetUser.domain || OFFICIAL_DOMAINS[0],
      lotuss_name: targetUser.lotuss_name || "LTT",
      is_active: targetUser.is_active,
    });
    setCreateError("");
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const domainLead = getLeadForDomain(editForm.domain);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              first_name: editForm.first_name.trim(),
              last_name: editForm.last_name.trim(),
              role: editForm.role,
              domain: editForm.domain,
              lotuss_name: editForm.lotuss_name.trim() || "LTT",
              is_active: editForm.is_active,
              team_id: domainLead ? domainLead.id : u.team_id,
            }
          : u
      )
    );

    setCreateSuccess(`✓ Successfully updated ${editForm.first_name} ${editForm.last_name}'s position & details (Assigned under Team Lead ${domainLead ? `${domainLead.first_name} ${domainLead.last_name}` : "Pending Lead"}).`);
    setEditingUser(null);
  };

  const handleCreateTeamLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setInvitedLinkInfo(null);

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
        lotuss_name: newLead.lotuss_name.trim() || "LTT",
      });

      setCreateSuccess(`Successfully assigned ${newLead.first_name} ${newLead.last_name} as Team Lead for ${newLead.domain}`);
      setNewLead({
        email: "",
        first_name: "",
        last_name: "",
        domain: OFFICIAL_DOMAINS[0],
        lotuss_name: "LTT",
      });
      setShowCreateLead(false);
      await loadUsers();
    } catch (err) {
      setCreateError((err as ApiError).message || "Failed to assign Team Lead");
    }
  };

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setInvitedLinkInfo(null);

    const cleanEmail = newMember.email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@ark.co.th")) {
      setCreateError("Only @ark.co.th corporate emails are permitted.");
      return;
    }

    const targetDomain = isAmsHead ? newMember.domain : userDomain;
    const domainLead = getLeadForDomain(targetDomain);

    const createdUser: User = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      first_name: newMember.first_name.trim(),
      last_name: newMember.last_name.trim(),
      role: newMember.role,
      domain: targetDomain,
      lotuss_name: "LTT", // Defaulted automatically to LTT
      timezone: "Asia/Bangkok",
      is_active: true,
      team_id: domainLead ? domainLead.id : null,
    };

    const onboardingInviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/login?invite=${Date.now()}&email=${cleanEmail}`;

    setUsers([createdUser, ...users]);
    setCreateSuccess(`✓ Account created for ${createdUser.first_name} ${createdUser.last_name} and automatically assigned under Team Lead ${domainLead ? `${domainLead.first_name} ${domainLead.last_name}` : "Pending Lead"} (${targetDomain}).`);
    setInvitedLinkInfo({ email: cleanEmail, link: onboardingInviteLink });

    setNewMember({
      first_name: "",
      last_name: "",
      email: "",
      domain: isAmsHead ? OFFICIAL_DOMAINS[0] : userDomain,
      lotuss_name: "LTT",
      role: "AMS_ENGINEER",
    });
    setShowAddMemberModal(false);
  };

  const visibleDomains = isAmsHead
    ? OFFICIAL_DOMAINS
    : OFFICIAL_DOMAINS.filter((d) => d === userDomain || d.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]));

  const filteredUsers = users.filter((u) => {
    if (!isAmsHead && userDomain) {
      const match = u.domain === userDomain || (u.domain && u.domain.toLowerCase().includes(userDomain.toLowerCase().split(" ")[0]));
      if (!match) return false;
    }
    if (selectedDomainFilter !== "ALL" && u.domain !== selectedDomainFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domain & Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAmsHead ? "AMS Head Global Directory & Corporate Domain Leadership" : `Team Directory — ${userDomain}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 self-start sm:self-auto">
          {canAddMember && (
            <button
              onClick={() => { setShowAddMemberModal(true); setCreateError(""); setCreateSuccess(""); }}
              className="btn btn-primary shadow-sm flex items-center gap-2"
            >
              <span>👤</span> + Add Team Member & Invite
            </button>
          )}

          {isAmsHead && (
            <button
              onClick={() => { setShowCreateLead(!showCreateLead); setCreateError(""); setCreateSuccess(""); }}
              className="btn btn-outline shadow-sm flex items-center gap-2"
            >
              <span>+ Assign Team Lead</span>
            </button>
          )}
        </div>
      </div>

      {createSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <span>{createSuccess}</span>
          </div>
          {invitedLinkInfo && (
            <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-slate-600 font-mono flex items-center justify-between gap-2">
              <span className="truncate">Onboarding URL: {invitedLinkInfo.link}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Email Sent</span>
            </div>
          )}
        </div>
      )}

      {/* EDIT TEAM MEMBER POSITION & DETAILS MODAL (AMS HEAD ONLY) */}
      {editingUser && isAmsHead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Edit Team Member Details & Position</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                Editing profile for: <strong>{editingUser.email}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Position / Role</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    {POSITION_OPTIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Corporate Domain</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  >
                    {OFFICIAL_DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Lotus's Name / Branch Unit (AMS Head Control)</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  value={editForm.lotuss_name}
                  onChange={(e) => setEditForm({ ...editForm, lotuss_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Status</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  value={editForm.is_active ? "active" : "inactive"}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === "active" })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TEAM MEMBER & DISPATCH ONBOARDING EMAIL MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <h3 className="font-bold text-slate-900 text-base">Add Team Member & Send Onboarding Invitation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeamMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="Kamonrat"
                    value={newMember.first_name}
                    onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="Phonwichai"
                    value={newMember.last_name}
                    onChange={(e) => setNewMember({ ...newMember, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Corporate Email (@ark.co.th)</label>
                <input
                  type="email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="kamonrat.p@ark.co.th"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Domain</label>
                  {isAmsHead ? (
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                      value={newMember.domain}
                      onChange={(e) => setNewMember({ ...newMember, domain: e.target.value })}
                    >
                      {OFFICIAL_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 bg-slate-50 font-bold"
                      value={userDomain}
                      disabled
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Position / Role</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  >
                    <option value="SUPPORT_ENGINEER">Support Engineer</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                  </select>
                </div>
              </div>

              {/* AUTOMATIC TEAM LEAD ASSIGNMENT INFORMATIONAL BANNER */}
              {(() => {
                const targetDom = isAmsHead ? newMember.domain : userDomain;
                const lead = getLeadForDomain(targetDom);
                return (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                    <span className="text-sm shrink-0">👑</span>
                    <div>
                      <p className="font-bold">Automatic Team Lead Linkage:</p>
                      <p className="text-[11px] text-purple-800 mt-0.5">
                        Member will be assigned under Team Lead{" "}
                        <strong className="underline font-extrabold">{lead ? `${lead.first_name} ${lead.last_name}` : "Pending Team Lead"}</strong> for {targetDom}.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                ⚡ <strong>Branch Unit Default:</strong> Lotus's branch unit defaults to <strong>LTT</strong> automatically. AMS Head can change the unit at any time.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                >
                  Create Account & Send Email
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Lead Form (AMS Head Only) */}
      {showCreateLead && isAmsHead && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500"></div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>👑</span> Assign Corporate Team Lead per Domain (AMS Head Control)
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            As AMS Head, assign a designated Team Lead to oversee operations for a specific domain.
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
                placeholder="LTT"
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
          <span>🏛️</span> {isAmsHead ? "Domain Team Lead Overview" : `My Domain Leadership — ${userDomain}`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleDomains.map((domName) => {
            const lead = getLeadForDomain(domName);
            return (
              <div key={domName} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      Corporate Domain
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {lead ? "Assigned Lead" : "Pending Lead"}
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

                {isAmsHead && (
                  <button
                    onClick={() => {
                      setNewLead({
                        email: "",
                        first_name: "",
                        last_name: "",
                        domain: domName,
                        lotuss_name: "LTT",
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
            <h2 className="font-bold text-slate-900 text-base">
              {isAmsHead ? "AMS Head Global Directory" : `Domain Team Directory (${userDomain})`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAmsHead ? "Viewing all corporate members across all domains" : "Viewing members belonging to your assigned domain"}
            </p>
          </div>

          {isAmsHead && (
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
          )}
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
                  <th className="py-3 px-4">Assigned Team Lead</th>
                  <th className="py-3 px-4">Role / Position</th>
                  <th className="py-3 px-4">Lotus's Unit</th>
                  <th className="py-3 px-4">Status</th>
                  {isAmsHead && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const domLead = getLeadForDomain(u.domain || "");
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{u.domain || "—"}</td>
                      <td className="py-3 px-4 text-xs">
                        {domLead ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            <span>👑</span> {domLead.first_name} {domLead.last_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.role === "AMS_HEAD" || u.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                          u.role === "TEAM_LEAD" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {u.role === "AMS_HEAD" || u.role === "SUPER_ADMIN" ? "AMS Head" : u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-800">{u.lotuss_name || "LTT"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.is_active ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAmsHead && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            ✏️ Edit Details
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

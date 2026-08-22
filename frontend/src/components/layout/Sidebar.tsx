"use client";

/**
 * Sidebar navigation component.
 * Collapsible on mobile, role-aware navigation items.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
  section?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "My Shift", href: "/my-shift", icon: "⏱️" },
  { label: "Attendance", href: "/attendance", icon: "📋", roles: ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD", "VIEWER"] },
  { label: "Tickets", href: "/tickets", icon: "🎫" },
  // { label: "Handover", href: "/handover", icon: "🤝" },
  // Phase 3:
  // { label: "SLA", href: "/sla", icon: "⚡" },
  // { label: "Monitoring", href: "/monitoring", icon: "🔍" },
  // Phase 4:
  // { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Team", href: "/team", icon: "👥", section: "manage", roles: ["SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"] },
  { label: "Settings", href: "/settings", icon: "⚙️", section: "manage", roles: ["SUPER_ADMIN"] },
  // { label: "Audit Logs", href: "/audit", icon: "📜", section: "manage", roles: ["SUPER_ADMIN", "AMS_MANAGER"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || "";

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const mainItems = visibleItems.filter((i) => !i.section);
  const manageItems = visibleItems.filter((i) => i.section === "manage");

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 md:hidden btn btn-outline"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <aside
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-200 
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
          md:translate-x-0 md:static`}
        style={{
          width: "260px",
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-slate-700">
            <h1 className="text-lg font-bold text-white">AMS Operations</h1>
            <p className="text-xs text-slate-400 mt-0.5">SLA Management System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {mainItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setCollapsed(true)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                        ${isActive
                          ? "bg-blue-600 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {manageItems.length > 0 && (
              <>
                <div className="px-6 pt-6 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Management
                  </p>
                </div>
                <ul className="space-y-1 px-3">
                  {manageItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setCollapsed(true)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                            ${isActive
                              ? "bg-blue-600 text-white font-medium"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </nav>

          {/* User panel */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{userRole.replace("_", " ")}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left text-sm text-slate-400 hover:text-white transition-colors px-1 py-1"
            >
              Sign out →
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}

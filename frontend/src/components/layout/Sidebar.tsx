"use client";

/**
 * Sidebar navigation component.
 * Role-aware navigation, clean layout with zero overlapping UI elements.
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
  { label: "Attendance", href: "/attendance", icon: "📋", roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD", "VIEWER"] },
  { label: "Tickets", href: "/tickets", icon: "🎫" },
  { label: "Reports", href: "/reports", icon: "📈", roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"] },
  { label: "Team", href: "/team", icon: "👥", section: "manage", roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"] },
  { label: "Settings", href: "/settings", icon: "⚙️", section: "manage", roles: ["AMS_HEAD", "SUPER_ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // Default to collapsed on mobile screen width
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = user?.role || "";

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const mainItems = visibleItems.filter((i) => !i.section);
  const manageItems = visibleItems.filter((i) => i.section === "manage");

  return (
    <>
      {/* Mobile Top Header Bar (renders cleanly in flow on small screens) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white w-full sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus:outline-none"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">AMS Operations</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">SLA Platform</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
      </header>

      {/* Sidebar Drawer (Mobile Overlay + Fixed Desktop) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 transition-transform duration-200 shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{
          width: "260px",
          background: "var(--sidebar-bg, #0f172a)",
          color: "var(--sidebar-text, #cbd5e1)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">
                  AMS
                </div>
                <h1 className="text-base font-extrabold text-white tracking-tight">AMS Operations</h1>
              </div>
              <p className="text-xs text-slate-400">SLA Management System</p>
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {mainItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all
                        ${isActive
                          ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all
                            ${isActive
                              ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
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

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] font-semibold text-blue-400 truncate">
                  {userRole === "AMS_HEAD" || userRole === "SUPER_ADMIN" ? "AMS Head" : userRole.replace("_", " ")}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left text-xs font-medium text-slate-400 hover:text-red-400 transition-colors px-1 py-1 flex items-center gap-1.5"
            >
              <span>Sign out</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

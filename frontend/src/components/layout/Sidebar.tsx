"use client";

/**
 * Enterprise Sidebar navigation component with PWA App Installer.
 * Clean, professional SVG iconography, role-aware access control, and zero emoji clutter.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
  roles?: string[];
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "My Shift",
    href: "/my-shift",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Attendance",
    href: "/attendance",
    roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"],
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Tickets",
    href: "/tickets",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"],
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Team",
    href: "/team",
    section: "manage",
    roles: ["AMS_HEAD", "SUPER_ADMIN", "AMS_MANAGER", "TEAM_LEAD"],
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    section: "manage",
    roles: ["AMS_HEAD", "SUPER_ADMIN"],
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert("To install AMS Tracker on your device:\n\n• Desktop (Chrome/Edge): Click the Install icon in the address bar.\n• iOS (Safari): Tap Share ➔ 'Add to Home Screen'.\n• Android (Chrome): Tap Menu ➔ 'Install App'.");
    }
  };

  const userRole = user?.role || "";

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const mainItems = visibleItems.filter((i) => !i.section);
  const manageItems = visibleItems.filter((i) => i.section === "manage");

  return (
    <>
      {/* Mobile Top Header Bar */}
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
            <h1 className="text-sm font-bold text-white leading-none tracking-wide uppercase">AMS Operations</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Enterprise SLA Platform</p>
          </div>
        </div>

        <button
          onClick={handleInstallPwa}
          className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Install App</span>
        </button>
      </header>

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 transition-transform duration-200 shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{
          width: "260px",
          background: "#0f172a",
          color: "#cbd5e1",
        }}
      >
        <div className="flex flex-col h-full border-r border-slate-800/80">
          {/* Logo Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black tracking-wider">
                  AMS
                </div>
                <h1 className="text-base font-bold text-white tracking-wide">AMS Operations</h1>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Lotus's Enterprise SLA Platform</p>
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
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${isActive
                          ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                    >
                      {item.icon(isActive)}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {manageItems.length > 0 && (
              <>
                <div className="px-6 pt-6 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                            ${isActive
                              ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            }`}
                        >
                          {item.icon(isActive)}
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* PWA INSTALLATION BUTTON */}
            <div className="px-3 pt-6">
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Install Application</span>
              </button>
            </div>
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-blue-400/30">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] font-semibold text-blue-400 truncate">
                  {userRole === "AMS_HEAD" || userRole === "SUPER_ADMIN" ? "AMS Head" : userRole.replace("_", " ")}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  {(user as any)?.lotuss_name || "Lotus's HQ"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left text-xs font-medium text-slate-400 hover:text-red-400 transition-colors px-1 py-1 flex items-center justify-between"
            >
              <span>Sign out</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
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

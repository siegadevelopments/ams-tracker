"use client";

/**
 * Sidebar navigation component with PWA "Install AMS App" installation prompter.
 * Role-aware navigation, clean layout with zero overlapping UI elements.
 */

import React, { useState, useEffect } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setCanInstallPwa(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install AMS Tracker on your device:\n\n• On Chrome/Edge: Click the Install icon in the address bar.\n• On iOS (Safari): Tap Share ➔ 'Add to Home Screen'.\n• On Android: Tap Menu ➔ 'Install App'.");
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
            <h1 className="text-sm font-bold text-white leading-none">AMS Operations</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">SLA Platform</p>
          </div>
        </div>

        <button
          onClick={handleInstallPwa}
          className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          <span>📲</span> Install App
        </button>
      </header>

      {/* Sidebar Drawer */}
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

            {/* PWA INSTALLATION BUTTON */}
            <div className="px-3 pt-6">
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📲</span> Install AMS Tracker App
              </button>
            </div>
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md border border-blue-400/30">
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
                  🏢 {(user as any)?.lotuss_name || "Lotus's Thailand HQ"}
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

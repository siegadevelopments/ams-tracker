"use client";

/**
 * Login & Registration page — Google Account Chooser Social Sign-In & Onboarding.
 * Asks for Domain and Lotus's Name during onboarding registration.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [domain, setDomain] = useState("AMS Operations");
  const [lotussName, setLotussName] = useState("Lotus's Thailand HQ");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Google Account Chooser Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const performLoginOrRegisterWithGoogle = async (loginEmail: string) => {
    setError("");
    setGoogleLoading(true);
    setShowGoogleModal(false);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      if (!cleanEmail.endsWith("@ark.co.th")) {
        setError("Registration restricted: Only @ark.co.th corporate Google accounts are permitted.");
        setGoogleLoading(false);
        return;
      }

      // Execute login / registration with onboarding domain and Lotus's name
      const result = await api.login(cleanEmail, "Admin@123!");
      
      localStorage.setItem("ams_access_token", result.access_token);
      localStorage.setItem("ams_refresh_token", result.refresh_token);
      api.setToken(result.access_token);
      router.push("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Google Single Sign-On failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOpenGoogleModal = () => {
    setError("");
    setShowGoogleModal(true);
    setShowCustomInput(false);
    setCustomGoogleEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@ark.co.th")) {
      setError("Only @ark.co.th corporate emails are permitted.");
      setLoading(false);
      return;
    }

    try {
      const result = await api.login(cleanEmail, password);
      localStorage.setItem("ams_access_token", result.access_token);
      localStorage.setItem("ams_refresh_token", result.refresh_token);
      api.setToken(result.access_token);
      router.push("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
            <span className="text-2xl text-white font-extrabold tracking-wider">AMS</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AMS Operations</h1>
          <p className="text-slate-400 text-sm mt-1">SLA Management & Shift Tracking Platform</p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl mb-4 border border-slate-700/50">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === "signin"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === "register"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Auth card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
            {mode === "register" ? "Create your AMS Account" : "Sign in to your account"}
          </h2>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Google Social Login / Registration Button */}
          <button
            type="button"
            onClick={handleOpenGoogleModal}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-6"
          >
            {googleLoading ? (
              <span className="animate-spin inline-block w-5 h-5 border-2 border-slate-400/30 border-t-blue-600 rounded-full"></span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>
              {googleLoading
                ? "Processing Google Account..."
                : mode === "register"
                ? "Register with Google Account"
                : "Continue with Google"}
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider absolute">or</span>
          </div>

          {/* Email / Password & Onboarding form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
                      placeholder="Ernest"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
                      placeholder="Siega"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Onboarding Fields: Domain & Lotus's Name */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    🏢 Onboarding Details
                  </p>
                  <div>
                    <label htmlFor="domain" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Domain / Operations Focus
                    </label>
                    <select
                      id="domain"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    >
                      <option value="AMS Operations">AMS Operations</option>
                      <option value="Retail Technology">Retail Technology</option>
                      <option value="IT Infrastructure">IT Infrastructure</option>
                      <option value="Lotus's Digital Services">Lotus's Digital Services</option>
                      <option value="Application Management">Application Management</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lotussName" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Lotus's Name / Branch Unit
                    </label>
                    <input
                      id="lotussName"
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Lotus's Thailand HQ, Lotus's Bangna"
                      value={lotussName}
                      onChange={(e) => setLotussName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Work Email (@ark.co.th)
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-900 transition-all placeholder:text-slate-400"
                placeholder="name@ark.co.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-900 transition-all placeholder:text-slate-400"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                  Processing...
                </>
              ) : mode === "register" ? (
                "Create AMS Account"
              ) : (
                "Sign in with Email"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Superadmin: <span className="font-semibold text-slate-600">ernest.siega@ark.co.th</span>
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          AMS Operations & SLA Management System v0.1.0
        </p>
      </div>

      {/* Google Account Chooser & Onboarding Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="font-semibold text-slate-800 text-sm">
                  {mode === "register" ? "Register with Google Account" : "Choose an account"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {mode === "register" && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-blue-900">🏢 Onboarding Setup</p>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">Domain</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="AMS Operations"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">Lotus's Name</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="e.g. Lotus's Thailand HQ"
                    value={lotussName}
                    onChange={(e) => setLotussName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-4">
              to {mode === "register" ? "register & access" : "continue to"} <strong className="text-slate-700">AMS Operations</strong>
            </p>

            <div className="space-y-2 mb-4">
              {/* Account 1: Superadmin */}
              <button
                type="button"
                onClick={() => performLoginOrRegisterWithGoogle("ernest.siega@ark.co.th")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  ES
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Ernest Siega</p>
                  <p className="text-xs text-slate-500 truncate">ernest.siega@ark.co.th</p>
                </div>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                  Super Admin
                </span>
              </button>

              {/* Account 2: AMS Manager */}
              <button
                type="button"
                onClick={() => performLoginOrRegisterWithGoogle("manager@ark.co.th")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  AM
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">AMS Operations Manager</p>
                  <p className="text-xs text-slate-500 truncate">manager@ark.co.th</p>
                </div>
              </button>
            </div>

            {/* Custom Account Input Option */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 rounded-lg transition-colors border border-dashed border-blue-200 hover:bg-blue-50/30"
              >
                + Register/Use another @ark.co.th Google account
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customGoogleEmail.trim()) {
                    performLoginOrRegisterWithGoogle(customGoogleEmail);
                  }
                }}
                className="space-y-2 pt-2 border-t border-slate-100"
              >
                <input
                  type="email"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="user@ark.co.th"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {mode === "register" ? "Register Google Account" : "Continue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Login & Automated Onboarding Page.
 * - Single Sign-In view (no separate register tab).
 * - "Continue with Google": Checks if account exists.
 *   - Existing account -> Directly logs in.
 *   - New account -> Prompts Organization Onboarding (Domain & Lotus's Name) then completes sign-in.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

const EXISTING_ACCOUNTS = [
  "ernest.siega@ark.co.th",
  "manager@ark.co.th",
  "maria.santos@ark.co.th",
  "somchai.p@ark.co.th",
  "karthik.s@ark.co.th",
  "ananya.r@ark.co.th",
];

const DOMAIN_OPTIONS = [
  "Supply chain and Planning Domain",
  "Store Ops, Sales",
  "Finance",
  "Integration and Middleware Domain",
  "Buy and Merchandise Domain",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Flow State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");

  // Automated Onboarding State for New Users
  const [isNewUserOnboarding, setIsNewUserOnboarding] = useState(false);
  const [onboardingDomain, setOnboardingDomain] = useState(DOMAIN_OPTIONS[0]);
  const [onboardingLotussName, setOnboardingLotussName] = useState("Lotus's Thailand HQ");

  const handleOpenGoogleModal = () => {
    setError("");
    setShowGoogleModal(true);
    setShowCustomInput(false);
    setCustomGoogleEmail("");
    setIsNewUserOnboarding(false);
  };

  const handleSelectGoogleAccount = (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith("@ark.co.th")) {
      setError("Access restricted: Only @ark.co.th corporate Google accounts are permitted.");
      setShowGoogleModal(false);
      return;
    }

    setSelectedGoogleEmail(cleanEmail);

    // Check if account already exists
    const exists = EXISTING_ACCOUNTS.includes(cleanEmail);

    if (exists) {
      // Existing user: Directly log in
      executeLogin(cleanEmail);
    } else {
      // New user: Route to Onboarding Registration step inside modal
      setIsNewUserOnboarding(true);
    }
  };

  const executeLogin = async (loginEmail: string) => {
    setError("");
    setGoogleLoading(true);
    setShowGoogleModal(false);

    try {
      const result = await api.login(loginEmail, "Admin@123!");
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

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingLotussName.trim()) {
      setError("Please enter your Lotus's Branch / Unit name.");
      return;
    }

    // Save onboarding details to localStorage/Session
    localStorage.setItem("ams_user_domain", onboardingDomain);
    localStorage.setItem("ams_user_lotuss", onboardingLotussName);

    // Add to registered list and complete login
    EXISTING_ACCOUNTS.push(selectedGoogleEmail);
    await executeLogin(selectedGoogleEmail);
  };

  const handleStandardFormSubmit = async (e: React.FormEvent) => {
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

        {/* Auth card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Google Social Login Button */}
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
              {googleLoading ? "Authenticating Google Account..." : "Continue with Google"}
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider absolute">or</span>
          </div>

          {/* Work Email / Password Sign In */}
          <form onSubmit={handleStandardFormSubmit} className="space-y-4">
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
                  Signing in...
                </>
              ) : (
                "Sign in with Email"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            AMS Head: <span className="font-semibold text-slate-600">ernest.siega@ark.co.th</span>
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          AMS Operations & SLA Management System v0.1.0
        </p>
      </div>

      {/* Google Account Chooser & Automated Onboarding Modal */}
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
                  {isNewUserOnboarding ? "Organization Onboarding" : "Choose an account"}
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

            {/* STEP 2: NEW USER ONBOARDING FORM */}
            {isNewUserOnboarding ? (
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs font-bold text-blue-900">Welcome to AMS Operations!</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Account <strong>{selectedGoogleEmail}</strong> is not yet registered. Please enter your domain and Lotus's unit to complete onboarding.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Corporate Domain
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    value={onboardingDomain}
                    onChange={(e) => setOnboardingDomain(e.target.value)}
                  >
                    {DOMAIN_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Lotus's Name / Branch Unit
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Lotus's Thailand HQ, Lotus's Bangna"
                    value={onboardingLotussName}
                    onChange={(e) => setOnboardingLotussName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                  >
                    Complete Registration & Enter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewUserOnboarding(false)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl"
                  >
                    Back
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 1: GOOGLE ACCOUNT SELECTION LIST */
              <>
                <p className="text-xs text-slate-500 mb-4">
                  to continue to <strong className="text-slate-700">AMS Operations</strong>
                </p>

                <div className="space-y-2 mb-4">
                  {/* Account 1: Existing AMS Head */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount("ernest.siega@ark.co.th")}
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
                      AMS Head
                    </span>
                  </button>

                  {/* Account 2: Existing Team Lead */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount("maria.santos@ark.co.th")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      MS
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">Maria Santos</p>
                      <p className="text-xs text-slate-500 truncate">maria.santos@ark.co.th</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      Team Lead
                    </span>
                  </button>
                </div>

                {/* Custom Account Input Option for New Google Accounts */}
                {!showCustomInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 rounded-lg transition-colors border border-dashed border-blue-200 hover:bg-blue-50/30"
                  >
                    + Use another @ark.co.th Google account
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customGoogleEmail.trim()) {
                        handleSelectGoogleAccount(customGoogleEmail);
                      }
                    }}
                    className="space-y-2 pt-2 border-t border-slate-100"
                  >
                    <input
                      type="email"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="newuser@ark.co.th"
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
                        Continue with Google
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

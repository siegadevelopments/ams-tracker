"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { User } from "./api";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    let token = api.getToken();

    // Check if Supabase has an active OAuth session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.email) {
        // Authenticate user in AMS backend using Supabase Google account email
        const res = await api.login(session.user.email, "Admin@123!");
        token = res.access_token;
        localStorage.setItem("ams_access_token", token);
        api.setToken(token);
      }
    } catch {
      // Supabase OAuth check optional fallback
    }

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await api.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for Supabase OAuth auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === "SIGNED_IN" && session?.user?.email) {
        try {
          const res = await api.login(session.user.email, "Admin@123!");
          localStorage.setItem("ams_access_token", res.access_token);
          api.setToken(res.access_token);
          const currentUser = await api.getMe();
          setUser(currentUser);
        } catch {
          // Non-blocking
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

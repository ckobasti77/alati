"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConvexMutation, useConvexQuery } from "./convex";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthUser = {
  id: string;
  username: string;
  role: "admin" | "user";
};

type SessionResponse =
  | {
      user: AuthUser;
      expiresAt?: number;
    }
  | null
  | undefined;

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createProfile: (username: string, password: string) => Promise<void>;
};

const STORAGE_KEY = "evidencija.sessionToken";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setToken(stored);
    setBootstrapped(true);
  }, []);

  const session = useConvexQuery<SessionResponse>("auth:session", { token: token ?? undefined });

  useEffect(() => {
    if (!bootstrapped) return;
    if (session === undefined) {
      setStatus("checking");
      return;
    }
    if (session && token) {
      setUser(session.user);
      setStatus("authenticated");
      return;
    }
    setUser(null);
    setStatus("unauthenticated");
    if (token && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      setToken(null);
    }
  }, [bootstrapped, session, token]);

  const loginMutation = useConvexMutation<{
    username: string;
    password: string;
  }, { token: string; user: AuthUser }>("auth:login");
  const logoutMutation = useConvexMutation<{ token: string }>("auth:logout");
  const createUserMutation = useConvexMutation<{ token: string; username: string; password: string }>(
    "auth:createUser",
  );

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const response = await loginMutation({ username, password });
        if (response?.token) {
          setToken(response.token);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, response.token);
          }
          setStatus("authenticated");
          setUser(response.user);
        }
      } catch (error: any) {
        const message = error?.message || "Prijavljivanje neuspesno.";
        toast.error(message);
        throw error;
      }
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    const currentToken = token;
    setUser(null);
    setStatus("unauthenticated");
    setToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (currentToken) {
      try {
        await logoutMutation({ token: currentToken });
      } catch {
        // ignore logout errors
      }
    }
  }, [logoutMutation, token]);

  const createProfile = useCallback(
    async (username: string, password: string) => {
      if (!token || !user || user.role !== "admin") {
        throw new Error("Samo admin moze da dodaje profile.");
      }
      await createUserMutation({ token, username, password });
      toast.success("Profil uspesno dodat.");
    },
    [createUserMutation, token, user],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      login,
      logout,
      createProfile,
    }),
    [user, token, status, login, logout, createProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth mora biti koriscen unutar AuthProvider-a");
  }
  return ctx;
}

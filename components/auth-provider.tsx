"use client";

import api, { setApiAccessToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const initialized = useRef(false);

  const setAccessToken = useCallback((token: string) => {
    setAccessTokenState(token);
  }, []);

  // On mount: try to restore session via refresh token cookie
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetch("/api/auth/refresh", { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No session");
        return res.json() as Promise<{ accessToken: string }>;
      })
      .then(async (data) => {
        setApiAccessToken(data.accessToken);
        setAccessTokenState(data.accessToken);
        return api.get<AuthUser>("/auth/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
      })
      .then(({ data }) => {
        setUser(data);
      })
      .catch(() => {
        // No valid session; middleware will redirect to /login
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? "Credenciais inválidas");
      }
      const data = await res.json() as { accessToken: string; user: AuthUser };
      setApiAccessToken(data.accessToken);
      setAccessTokenState(data.accessToken);
      setUser(data.user);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setApiAccessToken(null);
    setAccessTokenState(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

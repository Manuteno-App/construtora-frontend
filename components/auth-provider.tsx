"use client";

import api from "@/lib/api";
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

    api
      .post<{ accessToken: string }>("/auth/refresh")
      .then(({ data }) => {
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
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
        email,
        password,
      });
      setAccessTokenState(data.accessToken);
      setUser(data.user);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
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

"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { setApiAccessToken } from "@/lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

function TokenSync() {
  const { accessToken } = useAuth();
  useEffect(() => {
    setApiAccessToken(accessToken);
  }, [accessToken]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TokenSync />
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

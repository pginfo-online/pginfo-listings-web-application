"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/src/api/errors";
import { PreferencesSync } from "./preferences";
import { useSavedPersistence } from "@/src/features/property/saved-store";

export function Providers({ children }: { children: ReactNode }) {
  useSavedPersistence();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: (attempt, error) =>
              attempt < 1 &&
              error instanceof ApiError &&
              [0, 502, 503, 504].includes(error.status),
            retryDelay: 900,
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("pginfo-session");
    channel.onmessage = () => {
      void client.cancelQueries({ queryKey: ["session"] });
      void client.cancelQueries({ queryKey: ["private"] });
      client.removeQueries({ queryKey: ["private"] });
      client.setQueryData(["session"], null);
      void client.invalidateQueries({ queryKey: ["session"] });
    };
    return () => channel.close();
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <PreferencesSync />
      {children}
    </QueryClientProvider>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { authStep, session } from "@/src/api/contracts";
import { ApiError } from "@/src/api/errors";

export const sessionKey = ["session"] as const;

async function currentUser(signal: AbortSignal) {
  const read = () => api("auth/me", session, { signal });
  try {
    return (await read()).data.user;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  const restore = async () => {
    try {
      return (await read()).data.user;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
    try {
      await api("auth/refresh-token", authStep, { method: "POST" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
    return (await read()).data.user;
  };
  // Refresh tokens rotate. Serialise session restoration across tabs where supported.
  return navigator.locks
    ? navigator.locks.request("pginfo-session", { signal }, restore)
    : restore();
}

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => currentUser(signal),
    staleTime: 30_000,
    retry: false,
  });
}

export function notifySessionChanged() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("pginfo-session");
    channel.postMessage("changed");
    channel.close();
  }
}

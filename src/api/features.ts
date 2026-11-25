"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "./errors";
import { envelope } from "./contracts";

const status = z.enum(["available", "unavailable", "unknown"]);
const features = envelope(z.object({ rentals: status, savedSearches: status }));

export function useFeatures(enabled = true) {
  return useQuery({
    queryKey: ["api-features"],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/features", { signal });
      if (!response.ok) throw new ApiError(response.status);
      return features.parse(await response.json()).data;
    },
    staleTime: 60_000,
  });
}

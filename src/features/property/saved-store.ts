"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { objectId } from "@/src/domain/search";

export const useSaved = create<{
  ids: string[];
  toggle: (id: string) => void;
}>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set(({ ids }) => ({
          ids: ids.includes(id)
            ? ids.filter((value) => value !== id)
            : [id, ...ids],
        })),
    }),
    {
      name: "pginfo-shortlist",
      skipHydration: true,
      partialize: ({ ids }) => ({ ids }),
      merge: (stored, current) => ({
        ...current,
        ids:
          typeof stored === "object" &&
          stored &&
          "ids" in stored &&
          Array.isArray(stored.ids)
            ? [
                ...new Set(
                  stored.ids.flatMap((value: unknown) => {
                    const parsed = objectId.safeParse(value);
                    return parsed.success ? [parsed.data] : [];
                  }),
                ),
              ]
            : [],
      }),
    },
  ),
);

export function useSavedPersistence() {
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === "pginfo-shortlist") void useSaved.persist.rehydrate();
    };
    void useSaved.persist.rehydrate();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
}

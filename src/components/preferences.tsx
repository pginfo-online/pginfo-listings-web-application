"use client";

import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "system" | "light" | "dark";
type Locale = "en" | "hi";
type Preferences = {
  theme: Theme;
  locale: Locale;
  city: string;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setCity: (city: string) => void;
};
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: "system",
      locale: "en",
      city: "",
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCity: (city) => set({ city }),
    }),
    {
      name: "pginfo-preferences",
      skipHydration: true,
      partialize: ({ theme, locale, city }) => ({ theme, locale, city }),
      merge: (stored, current) => {
        if (!stored || typeof stored !== "object") return current;
        const theme = "theme" in stored ? stored.theme : undefined;
        const locale = "locale" in stored ? stored.locale : undefined;
        return {
          ...current,
          theme: theme === "light" || theme === "dark" ? theme : "system",
          locale: locale === "hi" ? "hi" : "en",
          city:
            "city" in stored && typeof stored.city === "string"
              ? stored.city.slice(0, 100)
              : "",
        };
      },
    },
  ),
);

export function useCopy() {
  const locale = usePreferences((state) => state.locale);
  return (en: string, hi: string) => (locale === "hi" ? hi : en);
}

export function Copy({ children, hi }: { children: ReactNode; hi: string }) {
  const locale = usePreferences((state) => state.locale);
  return locale === "hi" ? hi : children;
}

export function PreferencesSync() {
  useEffect(() => {
    const apply = ({ theme, locale }: Preferences) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.lang = locale;
    };
    const unsubscribe = usePreferences.subscribe(apply);
    void usePreferences.persist.rehydrate();
    apply(usePreferences.getState());
    return unsubscribe;
  }, []);
  return null;
}

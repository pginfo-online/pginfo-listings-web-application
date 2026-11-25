"use client";

import { useEffect } from "react";
import { usePreferences } from "@/src/components/preferences";

export function CitySync({ city }: { city?: string }) {
  const setCity = usePreferences((state) => state.setCity);
  useEffect(() => {
    if (city) setCity(city);
  }, [city, setCity]);
  return null;
}

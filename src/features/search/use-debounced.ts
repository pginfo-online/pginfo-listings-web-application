"use client";

import { useEffect, useState } from "react";

export function useDebounced(value: string, delay = 300) {
  const [term, setTerm] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setTerm(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return term;
}

"use client";

import { useEffect } from "react";
import { Failure } from "@/src/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({ event: "route_error", digest: error.digest }),
    );
  }, [error]);
  return (
    <div className="shell page-section">
      <h1>We couldn’t load this page</h1>
      <Failure error={error} retry={reset} />
    </div>
  );
}

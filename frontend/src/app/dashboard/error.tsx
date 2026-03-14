"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error.message, error.stack, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-heading px-4">
      <h1 className="text-3xl font-bold text-error mb-4">Dashboard Error</h1>
      <p className="text-muted mb-8 text-center max-w-md">
        Something went wrong loading the dashboard. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-sm"
      >
        Try Again
      </button>
    </div>
  );
}

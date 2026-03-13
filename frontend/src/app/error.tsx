"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error.message, error.stack);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-white px-4">
      <h1 className="text-5xl font-bold text-error mb-4">Oops!</h1>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted mb-8 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-semibold transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

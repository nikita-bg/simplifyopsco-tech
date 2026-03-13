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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a14] text-white px-4">
      <h1 className="text-3xl font-bold text-red-400 mb-4">Dashboard Error</h1>
      <pre className="text-xs text-red-300 mb-4 max-w-lg overflow-auto bg-white/5 rounded-lg p-4 border border-red-500/20 whitespace-pre-wrap">
        {error.message}
      </pre>
      {error.digest && (
        <p className="text-xs text-gray-500 mb-4">Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#256af4] hover:bg-[#1a4bbd] rounded-lg font-semibold transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

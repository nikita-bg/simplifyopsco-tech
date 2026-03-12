"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a14] text-white px-4">
      <h1 className="text-5xl font-bold text-red-400 mb-4">Oops!</h1>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#256af4] hover:bg-[#1a4bbd] rounded-lg font-semibold transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

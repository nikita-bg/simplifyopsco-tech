import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a14] text-white px-4">
      <h1 className="text-7xl font-bold text-[#256af4] mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-[#256af4] hover:bg-[#1a4bbd] rounded-lg font-semibold transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

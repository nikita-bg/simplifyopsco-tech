import Link from "next/link";
import { signup, signInWithGoogle } from "../actions";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;
    const error = params?.error;

    return (
        <div className="glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl animate-fade-in">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <span className="material-symbols-outlined text-2xl">
                            graphic_eq
                        </span>
                    </div>
                    <span className="text-xl font-bold text-white">Vocalize AI</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
                <p className="text-sm text-slate-400">Start your free trial today</p>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {decodeURIComponent(error)}
                </div>
            )}

            {/* Signup form */}
            <form action={signup} className="space-y-4">
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                    >
                        Full Name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@company.com"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
                <button
                    type="submit"
                    id="signup-submit-btn"
                    className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                >
                    Create Account
                </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or continue with</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google OAuth */}
            <form action={signInWithGoogle}>
                <button
                    type="submit"
                    id="signup-google-btn"
                    className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
}

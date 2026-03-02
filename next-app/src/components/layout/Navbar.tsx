import Link from "next/link";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-white/10 glass-panel">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <span className="material-symbols-outlined text-2xl">
                                graphic_eq
                            </span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Vocalize AI
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            href="/#features"
                            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                        >
                            Features
                        </Link>
                        <Link
                            href="/#use-cases"
                            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                        >
                            Use Cases
                        </Link>
                        <Link
                            href="/#pricing"
                            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/docs"
                            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                        >
                            Docs
                        </Link>
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            id="navbar-login-btn"
                            className="hidden sm:block text-sm font-medium text-slate-900 dark:text-white hover:opacity-80 transition-opacity"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            id="navbar-demo-btn"
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-all hover:bg-primary-dark glow-box-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                        >
                            Try Live Demo
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

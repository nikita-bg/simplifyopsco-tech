"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

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

                    {/* Desktop Navigation */}
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

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/login"
                            id="navbar-login-btn"
                            className="text-sm font-medium text-slate-900 dark:text-white hover:opacity-80 transition-opacity"
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

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <span className="material-symbols-outlined text-2xl">
                            {mobileOpen ? "close" : "menu"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-white/10 bg-background-dark/95 backdrop-blur-xl">
                    <div className="px-4 py-4 space-y-1">
                        <MobileLink href="/#features" onClick={() => setMobileOpen(false)}>Features</MobileLink>
                        <MobileLink href="/#use-cases" onClick={() => setMobileOpen(false)}>Use Cases</MobileLink>
                        <MobileLink href="/#pricing" onClick={() => setMobileOpen(false)}>Pricing</MobileLink>
                        <MobileLink href="/docs" onClick={() => setMobileOpen(false)}>Docs</MobileLink>
                        <div className="pt-3 mt-3 border-t border-white/10 flex flex-col gap-2">
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="w-full py-2.5 rounded-lg text-center text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                onClick={() => setMobileOpen(false)}
                                className="w-full py-2.5 rounded-lg text-center text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
                            >
                                Try Live Demo
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="block py-2.5 px-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
        >
            {children}
        </Link>
    );
}

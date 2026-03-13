"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-edge glass-panel">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                <span className="material-symbols-outlined text-2xl">graphic_eq</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-heading">SimplifyOps</span>
                        </div>
                        <nav className="hidden lg:flex items-center gap-8">
                            <Link className="text-sm font-medium text-muted hover:text-primary transition-colors" href="#features">Features</Link>
                            <Link className="text-sm font-medium text-muted hover:text-primary transition-colors" href="#use-cases">Use Cases</Link>
                            <Link className="text-sm font-medium text-muted hover:text-primary transition-colors" href="#pricing">Pricing</Link>
                            <Link className="text-sm font-medium text-muted hover:text-primary transition-colors" href="#how-it-works">How It Works</Link>
                        </nav>
                        <div className="hidden sm:flex items-center gap-4">
                            <Link className="text-sm font-medium text-heading hover:opacity-80 transition-opacity" href="/auth/sign-in">Login</Link>
                            <Link
                                className="hidden lg:inline-flex h-9 items-center justify-center rounded-lg border border-edge bg-white/5 px-4 text-sm font-semibold text-heading transition-all hover:bg-white/10 focus:outline-none"
                                href="/install"
                            >
                                Install Widget
                            </Link>
                            <Link
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-[0_0_20px_-5px_oklch(52%_0.22_260/0.5)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-canvas"
                                href="/auth/sign-up"
                            >
                                Get Started Free
                            </Link>
                        </div>
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            aria-label="Toggle menu"
                        >
                            <span className="material-symbols-outlined text-heading text-2xl">
                                {mobileMenuOpen ? "close" : "menu"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="sm:hidden border-t border-white/5 bg-canvas/95 backdrop-blur-xl overflow-hidden"
                        >
                            <nav className="flex flex-col px-4 py-4 gap-1">
                                <Link className="px-3 py-2.5 text-sm font-medium text-body hover:text-heading hover:bg-white/5 rounded-lg transition-colors" href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                                <Link className="px-3 py-2.5 text-sm font-medium text-body hover:text-heading hover:bg-white/5 rounded-lg transition-colors" href="#use-cases" onClick={() => setMobileMenuOpen(false)}>Use Cases</Link>
                                <Link className="px-3 py-2.5 text-sm font-medium text-body hover:text-heading hover:bg-white/5 rounded-lg transition-colors" href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
                                <Link className="px-3 py-2.5 text-sm font-medium text-body hover:text-heading hover:bg-white/5 rounded-lg transition-colors" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
                                <div className="border-t border-white/5 mt-2 pt-2 flex flex-col gap-2">
                                    <Link className="px-3 py-2.5 text-sm font-medium text-heading hover:bg-white/5 rounded-lg transition-colors" href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                                    <Link className="px-3 py-2.5 text-sm font-semibold text-center rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors" href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>Get Started Free</Link>
                                </div>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-40" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="flex-1 text-center lg:text-left"
                            >
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
                                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    14-Day Free Trial &mdash; No credit card required
                                </div>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-heading mb-6 leading-[1.1]">
                                    Your Website,<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 glow-text">Now With a Voice.</span>
                                </h1>
                                <p className="text-lg sm:text-xl text-muted mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Transform your site into an interactive experience with AI-powered voice assistant. Engage visitors with natural conversation, not just clicks.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-all hover:bg-primary-hover hover:scale-105 shadow-[0_0_30px_-5px_oklch(52%_0.22_260/0.4)]"
                                    >
                                        Try Free for 14 Days
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex h-12 items-center justify-center rounded-lg border border-edge bg-raised px-8 text-base font-semibold text-heading transition-all hover:bg-white/5"
                                    >
                                        <span className="material-symbols-outlined mr-2 text-xl">dashboard</span>
                                        View Dashboard
                                    </Link>
                                </div>
                            </motion.div>

                            {/* Hero Visual */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="flex-1 w-full max-w-[600px] lg:max-w-none"
                            >
                                <div className="relative rounded-2xl border border-edge bg-raised/50 shadow-2xl overflow-hidden aspect-[4/3] group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                                    <div className="absolute inset-4 rounded-xl border border-white/5 bg-canvas overflow-hidden flex flex-col">
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                            <div className="w-full max-w-xs space-y-4 p-6 glass-panel rounded-xl border border-edge shadow-2xl transform transition-transform group-hover:scale-105 duration-500">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                                                    <div className="h-2 w-24 rounded-full bg-white/20" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-2 w-full rounded-full bg-white/10" />
                                                    <div className="h-2 w-3/4 rounded-full bg-white/10" />
                                                    <div className="h-2 w-5/6 rounded-full bg-white/10" />
                                                </div>
                                                <div className="pt-4 flex justify-center gap-1">
                                                    <div className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                                                    <div className="w-1 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                                                    <div className="w-1 h-8 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    <div className="w-1 h-5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Bento Grid Features */}
                <section id="features" className="py-24 bg-canvas">
                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">Intelligent Capabilities</h2>
                            <p className="text-lg text-muted">Powering the next generation of conversational web interfaces with state-of-the-art neural networks.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                            {/* Feature 1: Web Automation */}
                            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-raised p-8 hover:border-primary/50 transition-colors duration-300">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                                            <span className="material-symbols-outlined text-3xl">smart_toy</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-heading mb-2">Web Automation</h3>
                                        <p className="text-muted max-w-md">Navigate and control complex web flows purely through voice commands. Our AI understands DOM structures and interacts like a human user.</p>
                                    </div>
                                    <div className="mt-8 relative h-32 w-full overflow-hidden rounded-lg bg-black/20 border border-white/5">
                                        <div className="absolute inset-0 flex items-center justify-center text-muted text-xs font-mono">
                                            &gt; Executing voice command: &quot;Book a demo for next Tuesday&quot;...
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2: Voice AI */}
                            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-raised p-8 hover:border-primary/50 transition-colors duration-300">
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                                        <span className="material-symbols-outlined text-3xl">graphic_eq</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-heading mb-2">Voice AI</h3>
                                    <p className="text-muted text-sm mb-6">Natural language processing that understands context, intent, and nuance in 40+ languages.</p>
                                    <div className="mt-auto flex justify-center gap-1 opacity-50">
                                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                                        <div className="w-1.5 h-10 bg-primary rounded-full" />
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        <div className="w-1.5 h-8 bg-primary rounded-full" />
                                        <div className="w-1.5 h-5 bg-primary rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Feature 3: Analytics */}
                            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-raised p-8 hover:border-primary/50 transition-colors duration-300">
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                                        <span className="material-symbols-outlined text-3xl">monitoring</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-heading mb-2">Real-time Analytics</h3>
                                    <p className="text-muted text-sm">Monitor user interactions and voice engagement metrics instantly with our live dashboard.</p>
                                    <div className="mt-auto pt-4">
                                        <div className="flex items-end gap-1 h-16">
                                            <div className="w-full bg-white/5 rounded-t h-[40%]" />
                                            <div className="w-full bg-white/5 rounded-t h-[70%]" />
                                            <div className="w-full bg-primary/20 rounded-t h-[50%]" />
                                            <div className="w-full bg-primary rounded-t h-[85%]" />
                                            <div className="w-full bg-white/5 rounded-t h-[60%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 4: Integration */}
                            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-raised p-8 hover:border-primary/50 transition-colors duration-300 flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-1">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                                        <span className="material-symbols-outlined text-3xl">integration_instructions</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-heading mb-2">Seamless Integration</h3>
                                    <p className="text-muted">Add SimplifyOps to any website in minutes. Just copy, paste the embed code, and your AI voice assistant is live.</p>
                                </div>
                                <div className="flex-1 w-full bg-overlay rounded-lg p-4 font-mono text-xs text-slate-300 border border-edge shadow-inner">
                                    <p><span className="text-faint">&lt;!-- SimplifyOps Widget --&gt;</span></p>
                                    <p><span className="text-pink-500">&lt;script</span></p>
                                    <p className="pl-4"><span className="text-primary-400">src</span>=<span className="text-yellow-300">&quot;https://api.simplifyopsco.tech/widget-embed.js&quot;</span></p>
                                    <p className="pl-4"><span className="text-primary-400">data-store-id</span>=<span className="text-yellow-300">&quot;your-store-id&quot;</span></p>
                                    <p className="pl-4"><span className="text-primary-400">data-color</span>=<span className="text-yellow-300">&quot;#6366f1&quot;</span></p>
                                    <p><span className="text-pink-500">&gt;&lt;/script&gt;</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">Simple, Transparent Pricing</h2>
                            <p className="text-lg text-muted">Choose the plan that fits your business needs. All plans include a 14-day free trial.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            {/* Starter */}
                            <div className="rounded-2xl border border-edge bg-raised p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Starter</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-heading">$39</span>
                                        <span className="text-muted">/mo</span>
                                    </div>
                                    <p className="text-sm text-muted mt-2">Perfect for small stores getting started.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=starter" className="w-full py-2.5 rounded-lg border border-edge bg-transparent text-heading font-semibold hover:bg-white/5 transition-colors text-center">
                                    Get Started
                                </Link>
                                <div className="space-y-3">
                                    <PricingFeature text="100 minutes/month" />
                                    <PricingFeature text="500 products" />
                                    <PricingFeature text="Basic analytics" />
                                    <PricingFeature text="Email support" />
                                </div>
                            </div>

                            {/* Growth (Highlighted) */}
                            <div className="rounded-2xl border-2 border-primary bg-raised p-8 flex flex-col gap-6 relative shadow-[0_0_40px_-10px_oklch(52%_0.22_260/0.3)] transform md:-translate-y-4">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Growth</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-heading">$99</span>
                                        <span className="text-muted">/mo</span>
                                    </div>
                                    <p className="text-sm text-muted mt-2">For growing businesses needing power.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=growth" className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25 text-center">
                                    Start Free Trial
                                </Link>
                                <div className="space-y-3">
                                    <PricingFeaturePro text="300 minutes/month" />
                                    <PricingFeaturePro text="5,000 products" />
                                    <PricingFeaturePro text="Custom brand voice" />
                                    <PricingFeaturePro text="Full analytics + transcripts" />
                                    <PricingFeaturePro text="Priority support" />
                                </div>
                            </div>

                            {/* Scale */}
                            <div className="rounded-2xl border border-edge bg-raised p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Scale</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-heading">$299</span>
                                        <span className="text-muted">/mo</span>
                                    </div>
                                    <p className="text-sm text-muted mt-2">Full control and unlimited scale.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=scale" className="w-full py-2.5 rounded-lg border border-edge bg-transparent text-heading font-semibold hover:bg-white/5 transition-colors text-center">
                                    Get Started
                                </Link>
                                <div className="space-y-3">
                                    <PricingFeature text="1,000 minutes/month" />
                                    <PricingFeature text="Unlimited products" />
                                    <PricingFeature text="Multilingual voice" />
                                    <PricingFeature text="Dedicated support" />
                                    <PricingFeature text="Custom SLAs" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-canvas">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="rounded-3xl bg-gradient-to-r from-raised to-overlay border border-edge p-10 md:p-16 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-bold text-heading mb-6">Ready to give your site a voice?</h2>
                                <p className="text-body text-lg mb-10 max-w-2xl mx-auto">Join innovative companies using SimplifyOps to transform their customer engagement.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg shadow-primary/25"
                                    >
                                        Get Started for Free
                                    </Link>
                                    <a
                                        href="mailto:hello@simplifyopsco.tech"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm px-8 text-base font-semibold text-heading transition-all hover:bg-white/20"
                                    >
                                        Schedule Demo
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-edge bg-canvas pt-16 pb-8">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary">
                                    <span className="material-symbols-outlined text-sm">graphic_eq</span>
                                </div>
                                <span className="text-lg font-bold text-heading">SimplifyOps</span>
                            </div>
                            <p className="text-muted text-sm max-w-xs mb-6">
                                Making the web conversational, one website at a time. AI-powered voice interface for modern web applications.
                            </p>
                        </div>
                        <FooterCol title="Product" links={[
                            { label: "Features", href: "#features" },
                            { label: "Pricing", href: "/pricing" },
                            { label: "Install", href: "/install" },
                        ]} />
                        <FooterCol title="Resources" links={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Documentation", href: "#how-it-works" },
                        ]} />
                        <FooterCol title="Company" links={[
                            { label: "Contact", href: "mailto:hello@simplifyopsco.tech" },
                            { label: "Privacy Policy", href: "/privacy" },
                            { label: "Terms of Service", href: "/terms" },
                        ]} />
                    </div>
                    <div className="border-t border-edge pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-faint">&copy; 2026 SimplifyOps. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </>
    );
}

function PricingFeature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-sm text-body">
            <span className="material-symbols-outlined text-success text-lg">check</span>
            {text}
        </div>
    );
}

function PricingFeaturePro({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-sm text-body">
            <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
            {text}
        </div>
    );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-heading mb-4">{title}</h3>
            <ul className="space-y-3 text-sm text-muted">
                {links.map((link) => (
                    <li key={link.label}><a className="hover:text-primary transition-colors" href={link.href}>{link.label}</a></li>
                ))}
            </ul>
        </div>
    );
}

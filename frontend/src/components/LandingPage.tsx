"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
    AudioWaveform, 
    Menu, 
    X, 
    LayoutDashboard, 
    Bot, 
    Activity, 
    Code, 
    Check, 
    CheckCircle2, 
    ChevronRight,
    Star,
    MessageSquare,
    BarChart3
} from "lucide-react";
import { DemoAgent } from "./DemoAgent";

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
                                <AudioWaveform className="w-5 h-5" />
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
                            {mobileMenuOpen ? <X className="w-6 h-6 text-heading" /> : <Menu className="w-6 h-6 text-heading" />}
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
                <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32">
                    {/* Gradient glow background */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="flex-1 text-center lg:text-left"
                            >
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary mb-6">
                                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    14-Day Free Trial &mdash; No credit card required
                                </div>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-heading mb-6 leading-[1.15]">
                                    Give your website <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 glow-text">a natural voice.</span>
                                </h1>
                                <p className="text-base sm:text-lg lg:text-xl text-muted mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Transform your SaaS into an interactive experience. Engage visitors with AI-powered conversational voice agents that understand intent and navigate flows.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-all hover:bg-primary-hover shadow-lg shadow-primary/25"
                                    >
                                        Start Free Trial
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex h-12 items-center justify-center rounded-lg border border-edge bg-raised px-8 text-base font-semibold text-heading transition-all hover:bg-white/5"
                                    >
                                        <LayoutDashboard className="w-5 h-5 mr-2" />
                                        View Demo Dashboard
                                    </Link>
                                </div>
                            </motion.div>

                            {/* Hero Visual - Perspective Skew Dashboard */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="flex-1 w-full max-w-[650px] lg:max-w-none perspective-container hidden sm:block"
                                style={{ perspective: "1000px" }}
                            >
                                <div 
                                    className="relative rounded-xl border border-edge shadow-2xl bg-panel overflow-hidden"
                                    style={{ transform: "rotateY(-10deg) rotateX(5deg)", transformStyle: "preserve-3d" }}
                                >
                                    {/* Mock Dashboard Header */}
                                    <div className="h-12 border-b border-edge bg-canvas-inset flex items-center px-4 gap-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                        </div>
                                        <div className="h-6 w-64 bg-raised rounded-md text-xs text-muted flex items-center px-3 gap-2 border border-edge">
                                            <Bot className="w-3 h-3" />
                                            app.simplifyopsco.tech
                                        </div>
                                    </div>
                                    {/* Mock Dashboard Body */}
                                    <div className="flex h-[380px]">
                                        {/* Sidebar */}
                                        <div className="w-48 border-r border-edge p-4 flex flex-col gap-2">
                                            <div className="h-8 bg-primary/10 rounded-md border border-primary/20 flex items-center px-3 mb-2">
                                                <div className="h-2 w-16 bg-primary/50 rounded-full" />
                                            </div>
                                            <div className="h-8 hover:bg-white/5 rounded-md flex items-center px-3">
                                                <div className="h-2 w-20 bg-white/10 rounded-full" />
                                            </div>
                                            <div className="h-8 hover:bg-white/5 rounded-md flex items-center px-3">
                                                <div className="h-2 w-14 bg-white/10 rounded-full" />
                                            </div>
                                        </div>
                                        {/* Main Content */}
                                        <div className="flex-1 p-6 bg-canvas overflow-hidden">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="h-4 w-32 bg-white/20 rounded-full" />
                                                <div className="h-8 w-24 bg-primary rounded-md" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="bg-panel border border-edge rounded-lg p-4">
                                                    <div className="h-3 w-16 bg-white/10 rounded-full mb-3" />
                                                    <div className="h-6 w-24 bg-white/20 rounded-full" />
                                                </div>
                                                <div className="bg-panel border border-edge rounded-lg p-4">
                                                    <div className="h-3 w-16 bg-white/10 rounded-full mb-3" />
                                                    <div className="flex items-end gap-1 h-8 opacity-50">
                                                        <div className="w-4 h-[40%] bg-primary rounded-sm" />
                                                        <div className="w-4 h-[70%] bg-primary rounded-sm" />
                                                        <div className="w-4 h-[50%] bg-primary rounded-sm" />
                                                        <div className="w-4 h-[90%] bg-primary rounded-sm" />
                                                        <div className="w-4 h-[60%] bg-primary rounded-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-panel border border-edge rounded-lg h-32 p-4 relative overflow-hidden">
                                                <div className="h-3 w-20 bg-white/10 rounded-full mb-4" />
                                                <div className="flex flex-col gap-3">
                                                    <div className="h-2 w-full bg-white/5 rounded-full" />
                                                    <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                                                    <div className="h-2 w-5/6 bg-white/5 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Overlay Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent pointer-events-none" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="py-10 border-y border-edge bg-canvas-inset">
                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted">
                        <p className="text-sm font-medium mb-6 uppercase tracking-widest text-faint">Trusted by leading SaaS teams</p>
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
                            <div className="flex items-center gap-2 text-xl font-bold"><LayoutDashboard className="w-6 h-6" /> AcmeCorp</div>
                            <div className="flex items-center gap-2 text-xl font-bold"><Activity className="w-6 h-6" /> PulseHQ</div>
                            <div className="flex items-center gap-2 text-xl font-bold"><MessageSquare className="w-6 h-6" /> ChatterBox</div>
                            <div className="flex items-center gap-2 text-xl font-bold"><Bot className="w-6 h-6" /> NexusAI</div>
                        </div>
                    </div>
                </section>

                {/* Bento Grid Features */}
                <section id="features" className="py-24 bg-canvas">
                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">Powerful Voice Intelligence</h2>
                            <p className="text-base sm:text-lg text-muted">Deploy state-of-the-art conversational pipelines with zero infrastructure management.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
                            {/* Feature 1: Web Automation */}
                            <div className="md:col-span-2 relative group overflow-hidden border border-edge bg-panel rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5 border border-primary/20">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-heading mb-2">Autonomous Web Navigation</h3>
                                        <p className="text-muted text-sm max-w-md">Agents interpret voice commands to interact with DOM elements, complete forms, and navigate multi-step workflows naturally.</p>
                                    </div>
                                    <div className="mt-6 flex gap-3 text-xs bg-canvas/50 border border-edge p-3 rounded-lg w-fit">
                                        <span className="text-primary-400 font-mono">1. identifyBtn(&quot;.submit-booking&quot;)</span>
                                        <ChevronRight className="w-4 h-4 text-faint" />
                                        <span className="text-success font-mono">2. executeClick()</span>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2: Voice AI */}
                            <div className="relative group overflow-hidden border border-edge bg-panel rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5 border border-primary/20">
                                        <AudioWaveform className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Ultra-Low Latency Voice</h3>
                                    <p className="text-muted text-sm mb-6">Sub-500ms conversational turnarounds. Feels like talking to a human over the phone.</p>
                                    <div className="mt-auto flex gap-1 opacity-70">
                                        {[40, 70, 40, 90, 60, 30].map((h, i) => (
                                            <div key={i} className="w-2 bg-primary/40 rounded-full" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Feature 3: Analytics */}
                            <div className="relative group overflow-hidden border border-edge bg-panel rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5 border border-primary/20">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Conversation Insights</h3>
                                    <p className="text-muted text-sm">Rich transcripts, sentiment analysis, and flow drop-off tracking.</p>
                                </div>
                            </div>

                            {/* Feature 4: Integration */}
                            <div className="md:col-span-2 relative group overflow-hidden border border-edge bg-panel rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-1">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5 border border-primary/20">
                                        <Code className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-heading mb-2">Drop-in Integration</h3>
                                    <p className="text-muted text-sm">Add our universal widget to any framework (React, Vue, Vanilla) via a single script tag.</p>
                                </div>
                                <div className="flex-1 w-full bg-canvas rounded-lg p-4 font-mono text-[11px] text-muted border border-edge shadow-inner overflow-x-auto">
                                    <p><span className="text-faint">&lt;!-- Add to head --&gt;</span></p>
                                    <p><span className="text-pink-400">&lt;script</span> <span className="text-primary-400">src=</span><span className="text-yellow-200">&quot;https://api.simplifyops.tech/js&quot;</span></p>
                                    <p className="pl-4"><span className="text-primary-400">data-store=</span><span className="text-yellow-200">&quot;YOUR_ID&quot;</span><span className="text-pink-400">&gt;&lt;/script&gt;</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 relative overflow-hidden bg-canvas-inset border-y border-edge">
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">Transparent Pricing</h2>
                            <p className="text-base text-muted">Scale seamlessly as your conversations grow.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Starter */}
                            <div className="border border-edge rounded-2xl bg-panel p-8 flex flex-col gap-6">
                                <div>
                                    <h3 className="text-xl font-bold text-heading">Starter</h3>
                                    <p className="text-sm text-muted mt-1">For small teams getting started</p>
                                    <div className="flex items-baseline gap-1 mt-4">
                                        <span className="text-4xl font-bold text-heading">$39</span>
                                        <span className="text-muted text-sm">/month</span>
                                    </div>
                                </div>
                                <Link href="/auth/sign-up?plan=starter" className="w-full py-2.5 rounded-lg border border-edge bg-raised text-heading font-medium hover:bg-white/5 transition-colors text-center text-sm">
                                    Start 14-Day Trial
                                </Link>
                                <div className="space-y-3 pt-4 border-t border-edge">
                                    <PricingFeature text="100 voice minutes/month" />
                                    <PricingFeature text="Standard AI model" />
                                    <PricingFeature text="Email Support" />
                                </div>
                            </div>

                            {/* Growth (Highlighted) */}
                            <div className="border border-primary rounded-2xl bg-panel p-8 flex flex-col gap-6 relative shadow-[0_0_40px_-15px_oklch(52%_0.22_260/0.4)]">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                    Most Popular
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-heading">Growth</h3>
                                    <p className="text-sm text-muted mt-1">For scaling businesses</p>
                                    <div className="flex items-baseline gap-1 mt-4">
                                        <span className="text-4xl font-bold text-heading">$99</span>
                                        <span className="text-muted text-sm">/month</span>
                                    </div>
                                </div>
                                <Link href="/auth/sign-up?plan=growth" className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors text-center text-sm">
                                    Start 14-Day Trial
                                </Link>
                                <div className="space-y-3 pt-4 border-t border-edge">
                                    <PricingFeaturePro text="500 voice minutes/month" />
                                    <PricingFeaturePro text="Premium low-latency models" />
                                    <PricingFeaturePro text="Advanced Analytics" />
                                    <PricingFeaturePro text="Priority Support" />
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
                            <div className="flex items-center gap-2 mb-4">
                                <AudioWaveform className="w-5 h-5 text-primary" />
                                <span className="text-lg font-bold text-heading tracking-tight">SimplifyOps</span>
                            </div>
                            <p className="text-muted text-sm max-w-xs mb-6">
                                The unified voice intelligence platform for SaaS. Engage users directly through conversation.
                            </p>
                        </div>
                        <FooterCol title="Product" links={[
                            { label: "Features", href: "#features" },
                            { label: "Pricing", href: "#pricing" },
                            { label: "Install", href: "/install" },
                        ]} />
                        <FooterCol title="Resources" links={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Documentation", href: "#how-it-works" },
                        ]} />
                        <FooterCol title="Company" links={[
                            { label: "Contact", href: "mailto:hello@simplifyopsco.tech" },
                            { label: "Privacy", href: "/privacy" },
                        ]} />
                    </div>
                    <div className="border-t border-edge pt-8 flex text-xs text-faint">
                        <p>&copy; 2026 SimplifyOps. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <DemoAgent />
        </>
    );
}

function PricingFeature({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2 text-sm text-body">
            <Check className="w-4 h-4 text-success mt-0.5" />
            <span>{text}</span>
        </div>
    );
}

function PricingFeaturePro({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2 text-sm text-body">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
            <span>{text}</span>
        </div>
    );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h3 className="text-sm font-medium text-heading mb-4">{title}</h3>
            <ul className="space-y-2.5 text-sm text-muted">
                {links.map((link) => (
                    <li key={link.label}><a className="hover:text-primary transition-colors" href={link.href}>{link.label}</a></li>
                ))}
            </ul>
        </div>
    );
}

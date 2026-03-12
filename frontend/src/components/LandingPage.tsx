"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export function LandingPage() {
    return (
        <>
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#256af4]/20 text-[#256af4]">
                                <span className="material-symbols-outlined text-2xl">graphic_eq</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">SimplifyOps</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#features">Features</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#use-cases">Use Cases</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#pricing">Pricing</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#how-it-works">How It Works</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <Link className="hidden sm:block text-sm font-medium text-white hover:opacity-80 transition-opacity" href="/auth/sign-in">Login</Link>
                            <Link
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none"
                                href="/install"
                            >
                                Install Widget
                            </Link>
                            <Link
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#256af4] px-4 text-sm font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:shadow-[0_0_20px_-5px_rgba(37,106,244,0.5)] focus:outline-none focus:ring-2 focus:ring-[#256af4] focus:ring-offset-2 focus:ring-offset-[#0f1115]"
                                href="/auth/sign-up"
                            >
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-[#256af4]/20 blur-[120px] rounded-full pointer-events-none opacity-40" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="flex-1 text-center lg:text-left"
                            >
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#256af4]/20 bg-[#256af4]/5 px-3 py-1 text-xs font-medium text-[#256af4] mb-6">
                                    <span className="flex h-2 w-2 rounded-full bg-[#256af4] animate-pulse" />
                                    14-Day Free Trial &mdash; No credit card required
                                </div>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                                    Your Website,<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#256af4] to-indigo-400 glow-text">Now With a Voice.</span>
                                </h1>
                                <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Transform your site into an interactive experience with AI-powered voice assistant. Engage visitors with natural conversation, not just clicks.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-[#256af4] px-8 text-base font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:scale-105 shadow-[0_0_30px_-5px_rgba(37,106,244,0.4)]"
                                    >
                                        Try Free for 14 Days
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-[#181b21] px-8 text-base font-semibold text-white transition-all hover:bg-white/5"
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
                                <div className="relative rounded-2xl border border-white/10 bg-[#181b21]/50 shadow-2xl overflow-hidden aspect-[4/3] group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#256af4]/10 to-transparent opacity-50" />
                                    <div className="absolute inset-4 rounded-xl border border-white/5 bg-[#0f1115] overflow-hidden flex flex-col">
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                            <div className="w-full max-w-xs space-y-4 p-6 glass-panel rounded-xl border border-white/10 shadow-2xl transform transition-transform group-hover:scale-105 duration-500">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#256af4] to-purple-500" />
                                                    <div className="h-2 w-24 rounded-full bg-white/20" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-2 w-full rounded-full bg-white/10" />
                                                    <div className="h-2 w-3/4 rounded-full bg-white/10" />
                                                    <div className="h-2 w-5/6 rounded-full bg-white/10" />
                                                </div>
                                                <div className="pt-4 flex justify-center gap-1">
                                                    <div className="w-1 h-4 bg-[#256af4] rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                                                    <div className="w-1 h-6 bg-[#256af4] rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                                                    <div className="w-1 h-8 bg-[#256af4] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    <div className="w-1 h-5 bg-[#256af4] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
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
                <section id="features" className="py-24 bg-[#0b0d11]">
                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Intelligent Capabilities</h2>
                            <p className="text-lg text-slate-400">Powering the next generation of conversational web interfaces with state-of-the-art neural networks.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                            {/* Feature 1: Web Automation */}
                            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-[#181b21] p-8 hover:border-[#256af4]/50 transition-colors duration-300">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#256af4]/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="h-12 w-12 rounded-lg bg-[#256af4]/10 flex items-center justify-center text-[#256af4] mb-6">
                                            <span className="material-symbols-outlined text-3xl">smart_toy</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Web Automation</h3>
                                        <p className="text-slate-400 max-w-md">Navigate and control complex web flows purely through voice commands. Our AI understands DOM structures and interacts like a human user.</p>
                                    </div>
                                    <div className="mt-8 relative h-32 w-full overflow-hidden rounded-lg bg-black/20 border border-white/5">
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono">
                                            &gt; Executing voice command: &quot;Book a demo for next Tuesday&quot;...
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2: Voice AI */}
                            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#181b21] p-8 hover:border-[#256af4]/50 transition-colors duration-300">
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#256af4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-12 w-12 rounded-lg bg-[#256af4]/10 flex items-center justify-center text-[#256af4] mb-6">
                                        <span className="material-symbols-outlined text-3xl">graphic_eq</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Voice AI</h3>
                                    <p className="text-slate-400 text-sm mb-6">Natural language processing that understands context, intent, and nuance in 40+ languages.</p>
                                    <div className="mt-auto flex justify-center gap-1 opacity-50">
                                        <div className="w-1.5 h-6 bg-[#256af4] rounded-full" />
                                        <div className="w-1.5 h-10 bg-[#256af4] rounded-full" />
                                        <div className="w-1.5 h-4 bg-[#256af4] rounded-full" />
                                        <div className="w-1.5 h-8 bg-[#256af4] rounded-full" />
                                        <div className="w-1.5 h-5 bg-[#256af4] rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Feature 3: Analytics */}
                            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#181b21] p-8 hover:border-[#256af4]/50 transition-colors duration-300">
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-12 w-12 rounded-lg bg-[#256af4]/10 flex items-center justify-center text-[#256af4] mb-6">
                                        <span className="material-symbols-outlined text-3xl">monitoring</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Real-time Analytics</h3>
                                    <p className="text-slate-400 text-sm">Monitor user interactions and voice engagement metrics instantly with our live dashboard.</p>
                                    <div className="mt-auto pt-4">
                                        <div className="flex items-end gap-1 h-16">
                                            <div className="w-full bg-white/5 rounded-t h-[40%]" />
                                            <div className="w-full bg-white/5 rounded-t h-[70%]" />
                                            <div className="w-full bg-[#256af4]/20 rounded-t h-[50%]" />
                                            <div className="w-full bg-[#256af4] rounded-t h-[85%]" />
                                            <div className="w-full bg-white/5 rounded-t h-[60%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 4: Integration */}
                            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-[#181b21] p-8 hover:border-[#256af4]/50 transition-colors duration-300 flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-1">
                                    <div className="h-12 w-12 rounded-lg bg-[#256af4]/10 flex items-center justify-center text-[#256af4] mb-6">
                                        <span className="material-symbols-outlined text-3xl">integration_instructions</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Seamless Integration</h3>
                                    <p className="text-slate-400">Add SimplifyOps to any website in minutes. Just copy, paste the embed code, and your AI voice assistant is live.</p>
                                </div>
                                <div className="flex-1 w-full bg-[#1e1e1e] rounded-lg p-4 font-mono text-xs text-slate-300 border border-white/10 shadow-inner">
                                    <p><span className="text-gray-500">&lt;!-- SimplifyOps Widget --&gt;</span></p>
                                    <p><span className="text-pink-500">&lt;script</span></p>
                                    <p className="pl-4"><span className="text-blue-400">src</span>=<span className="text-yellow-300">&quot;https://api.simplifyopsco.tech/widget-embed.js&quot;</span></p>
                                    <p className="pl-4"><span className="text-blue-400">data-store-id</span>=<span className="text-yellow-300">&quot;your-store-id&quot;</span></p>
                                    <p className="pl-4"><span className="text-blue-400">data-color</span>=<span className="text-yellow-300">&quot;#6366f1&quot;</span></p>
                                    <p><span className="text-pink-500">&gt;&lt;/script&gt;</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-[#256af4]/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
                            <p className="text-lg text-slate-400">Choose the plan that fits your business needs. All plans include a 14-day free trial.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            {/* Starter */}
                            <div className="rounded-2xl border border-white/10 bg-[#181b21] p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Starter</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$39</span>
                                        <span className="text-slate-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Perfect for small stores getting started.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=starter" className="w-full py-2.5 rounded-lg border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5 transition-colors text-center">
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
                            <div className="rounded-2xl border-2 border-[#256af4] bg-[#13161c] p-8 flex flex-col gap-6 relative shadow-[0_0_40px_-10px_rgba(37,106,244,0.3)] transform md:-translate-y-4">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#256af4] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Growth</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$99</span>
                                        <span className="text-slate-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">For growing businesses needing power.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=growth" className="w-full py-2.5 rounded-lg bg-[#256af4] text-white font-semibold hover:bg-[#1a4bbd] transition-colors shadow-lg shadow-[#256af4]/25 text-center">
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
                            <div className="rounded-2xl border border-white/10 bg-[#181b21] p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Scale</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$299</span>
                                        <span className="text-slate-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Full control and unlimited scale.</p>
                                </div>
                                <Link href="/auth/sign-up?plan=scale" className="w-full py-2.5 rounded-lg border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5 transition-colors text-center">
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
                <section className="py-20 bg-[#0b0d11]">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="rounded-3xl bg-gradient-to-r from-[#181b21] to-[#1a1f29] border border-white/10 p-10 md:p-16 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-[#256af4]/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to give your site a voice?</h2>
                                <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">Join innovative companies using SimplifyOps to transform their customer engagement.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-[#256af4] px-8 text-base font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:shadow-lg shadow-[#256af4]/25"
                                    >
                                        Get Started for Free
                                    </Link>
                                    <a
                                        href="mailto:hello@simplifyopsco.tech"
                                        className="inline-flex h-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm px-8 text-base font-semibold text-white transition-all hover:bg-white/20"
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
            <footer className="border-t border-white/10 bg-[#0f1115] pt-16 pb-8">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#256af4]/20 text-[#256af4]">
                                    <span className="material-symbols-outlined text-sm">graphic_eq</span>
                                </div>
                                <span className="text-lg font-bold text-white">SimplifyOps</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-xs mb-6">
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
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-slate-500">&copy; 2026 SimplifyOps. All rights reserved.</p>
                        <div className="flex gap-6">
                            <Link className="text-xs text-slate-500 hover:text-slate-300" href="/privacy">Privacy Policy</Link>
                            <Link className="text-xs text-slate-500 hover:text-slate-300" href="/terms">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}

function PricingFeature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="material-symbols-outlined text-green-500 text-lg">check</span>
            {text}
        </div>
    );
}

function PricingFeaturePro({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="material-symbols-outlined text-[#256af4] text-lg">check_circle</span>
            {text}
        </div>
    );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
            <ul className="space-y-3 text-sm text-slate-400">
                {links.map((link) => (
                    <li key={link.label}><a className="hover:text-[#256af4] transition-colors" href={link.href}>{link.label}</a></li>
                ))}
            </ul>
        </div>
    );
}

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
                            <span className="text-xl font-bold tracking-tight text-white">Vocalize AI</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#features">Features</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#use-cases">Use Cases</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#pricing">Pricing</Link>
                            <Link className="text-sm font-medium text-slate-400 hover:text-[#256af4] transition-colors" href="#docs">Docs</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <Link className="hidden sm:block text-sm font-medium text-white hover:opacity-80 transition-opacity" href="/dashboard">Login</Link>
                            <Link
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none"
                                href="/install"
                            >
                                Install Widget
                            </Link>
                            <Link
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#256af4] px-4 text-sm font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:shadow-[0_0_20px_-5px_rgba(37,106,244,0.5)] focus:outline-none focus:ring-2 focus:ring-[#256af4] focus:ring-offset-2 focus:ring-offset-[#0f1115]"
                                href="#"
                            >
                                Try Live Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
                    {/* Background Gradient */}
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
                                    v2.0 is now live
                                </div>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                                    Your Website,<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#256af4] to-indigo-400 glow-text">Now With a Voice.</span>
                                </h1>
                                <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Transform your site into an interactive experience with the world&apos;s first AI Voice Copilot. Engage visitors with natural conversation, not just clicks.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <button className="inline-flex h-12 items-center justify-center rounded-lg bg-[#256af4] px-8 text-base font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:scale-105 shadow-[0_0_30px_-5px_rgba(37,106,244,0.4)] cursor-pointer">
                                        Try Live Demo
                                    </button>
                                    <button className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-[#181b21] px-8 text-base font-semibold text-white transition-all hover:bg-white/5 cursor-pointer">
                                        <span className="material-symbols-outlined mr-2 text-xl">play_circle</span>
                                        Watch Video
                                    </button>
                                </div>
                            </motion.div>

                            {/* Hero Visual — Abstract UI */}
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
                            {/* Feature 1: Web Automation — 2 cols */}
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

                            {/* Feature 2: Voice AI — 1 col */}
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

                            {/* Feature 3: Analytics — 1 col */}
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

                            {/* Feature 4: Integration — 2 cols */}
                            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-[#181b21] p-8 hover:border-[#256af4]/50 transition-colors duration-300 flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-1">
                                    <div className="h-12 w-12 rounded-lg bg-[#256af4]/10 flex items-center justify-center text-[#256af4] mb-6">
                                        <span className="material-symbols-outlined text-3xl">integration_instructions</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Seamless Integration</h3>
                                    <p className="text-slate-400">Add Vocalize to your React, Vue, or vanilla JS site in minutes. Just copy, paste, and customize your voice agent&apos;s personality.</p>
                                </div>
                                <div className="flex-1 w-full bg-[#1e1e1e] rounded-lg p-4 font-mono text-xs text-slate-300 border border-white/10 shadow-inner">
                                    <p><span className="text-pink-500">import</span> {"{ Vocalize }"} <span className="text-pink-500">from</span> <span className="text-yellow-300">&apos;@vocalize/sdk&apos;</span>;</p>
                                    <br />
                                    <p><span className="text-blue-400">const</span> agent = <span className="text-blue-400">new</span> Vocalize({"{"}</p>
                                    <p className="pl-4">apiKey: <span className="text-yellow-300">&apos;v_12345...&apos;</span>,</p>
                                    <p className="pl-4">voice: <span className="text-yellow-300">&apos;Sarah_Neutral&apos;</span></p>
                                    <p>{"}"});</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 relative overflow-hidden">
                    {/* Decorative Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-[#256af4]/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
                            <p className="text-lg text-slate-400">Choose the plan that fits your business needs. No hidden fees.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            {/* Starter */}
                            <div className="rounded-2xl border border-white/10 bg-[#181b21] p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Starter</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$49</span>
                                        <span className="text-slate-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Perfect for side projects and small sites.</p>
                                </div>
                                <button className="w-full py-2.5 rounded-lg border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5 transition-colors cursor-pointer">
                                    Get Started
                                </button>
                                <div className="space-y-3">
                                    <PricingFeature text="5k Voice Interactions" />
                                    <PricingFeature text="Basic Analytics" />
                                    <PricingFeature text="Email Support" />
                                </div>
                            </div>

                            {/* Pro (Highlighted) */}
                            <div className="rounded-2xl border-2 border-[#256af4] bg-[#13161c] p-8 flex flex-col gap-6 relative shadow-[0_0_40px_-10px_rgba(37,106,244,0.3)] transform md:-translate-y-4">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#256af4] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$149</span>
                                        <span className="text-slate-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">For growing businesses needing power.</p>
                                </div>
                                <button className="w-full py-2.5 rounded-lg bg-[#256af4] text-white font-semibold hover:bg-[#1a4bbd] transition-colors shadow-lg shadow-[#256af4]/25 cursor-pointer">
                                    Start Free Trial
                                </button>
                                <div className="space-y-3">
                                    <PricingFeaturePro text="50k Voice Interactions" />
                                    <PricingFeaturePro text="Advanced Sentiment Analysis" />
                                    <PricingFeaturePro text="Priority Support" />
                                    <PricingFeaturePro text="Custom Voice Clone" />
                                </div>
                            </div>

                            {/* Enterprise */}
                            <div className="rounded-2xl border border-white/10 bg-[#181b21] p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Enterprise</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">Custom</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Full control and unlimited scale.</p>
                                </div>
                                <button className="w-full py-2.5 rounded-lg border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5 transition-colors cursor-pointer">
                                    Contact Sales
                                </button>
                                <div className="space-y-3">
                                    <PricingFeature text="Unlimited Interactions" />
                                    <PricingFeature text="On-premise Deployment" />
                                    <PricingFeature text="Dedicated Account Manager" />
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
                            {/* Background blobs */}
                            <div className="absolute top-0 left-0 w-64 h-64 bg-[#256af4]/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to give your site a voice?</h2>
                                <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">Join thousands of innovative companies using Vocalize AI to transform their user engagement metrics today.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button className="inline-flex h-12 items-center justify-center rounded-lg bg-[#256af4] px-8 text-base font-semibold text-white transition-all hover:bg-[#1a4bbd] hover:shadow-lg shadow-[#256af4]/25 cursor-pointer">
                                        Get Started for Free
                                    </button>
                                    <button className="inline-flex h-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm px-8 text-base font-semibold text-white transition-all hover:bg-white/20 cursor-pointer">
                                        Schedule Demo
                                    </button>
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
                                <span className="text-lg font-bold text-white">Vocalize AI</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-xs mb-6">
                                Making the web conversational, one website at a time. The first AI-powered voice interface for modern web applications.
                            </p>
                            <div className="flex gap-4">
                                <a className="text-slate-400 hover:text-white transition-colors" href="#">
                                    <span className="sr-only">Twitter</span>
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                                </a>
                                <a className="text-slate-400 hover:text-white transition-colors" href="#">
                                    <span className="sr-only">GitHub</span>
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fillRule="evenodd" /></svg>
                                </a>
                            </div>
                        </div>
                        <FooterCol title="Product" links={["Features", "Integrations", "Pricing", "Changelog"]} />
                        <FooterCol title="Resources" links={["Documentation", "API Reference", "Community", "Blog"]} />
                        <FooterCol title="Company" links={["About", "Careers", "Legal", "Contact"]} />
                    </div>
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-slate-500">© 2026 Vocalize AI Inc. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a className="text-xs text-slate-500 hover:text-slate-300" href="#">Privacy Policy</a>
                            <a className="text-xs text-slate-500 hover:text-slate-300" href="#">Terms of Service</a>
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

function FooterCol({ title, links }: { title: string; links: string[] }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
            <ul className="space-y-3 text-sm text-slate-400">
                {links.map((link) => (
                    <li key={link}><a className="hover:text-[#256af4] transition-colors" href="#">{link}</a></li>
                ))}
            </ul>
        </div>
    );
}

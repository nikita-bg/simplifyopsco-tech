"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowLeft, Globe, Mail, Copy, Check, ExternalLink, Code2, Zap, Shield, BarChart3 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-voice-shopping-assistant-production.up.railway.app";

interface InstallResult {
    store_id: string;
    site_url: string;
    embed_code: string;
    widget_url: string;
    preview_url: string;
}

export default function InstallPage() {
    const [siteUrl, setSiteUrl] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<InstallResult | null>(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const handleInstall = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
            const res = await fetch(`${API_URL}/api/install`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ site_url: url, contact_email: email }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result.embed_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="min-h-screen bg-[#0a0a14] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {/* Navbar */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 text-gray-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#256af4]/20 flex items-center justify-center">
                            <Mic className="w-3.5 h-3.5 text-[#256af4]" />
                        </div>
                        <span className="font-bold text-sm">Vocalize AI</span>
                    </div>
                    <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
                {/* Hero */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#256af4]/20 bg-[#256af4]/5 px-3 py-1 text-xs font-medium text-[#256af4] mb-6">
                            <span className="flex h-2 w-2 rounded-full bg-[#256af4] animate-pulse" />
                            Any Website • 2-Minute Setup
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
                            Add Voice AI to<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#256af4] to-indigo-400">
                                Any Website
                            </span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-xl mx-auto">
                            Enter your website URL and get a ready-to-paste script tag.
                            Works with Shopify, WordPress, Webflow, or any HTML site.
                        </p>
                    </motion.div>
                </div>

                <div className="grid lg:grid-cols-5 gap-8 items-start">
                    {/* Left Column: Form + Result */}
                    <div className="lg:col-span-3 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6"
                        >
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-[#256af4]" />
                                Get Your Embed Code
                            </h2>
                            <form onSubmit={handleInstall} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                                        Website URL *
                                    </label>
                                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#256af4]/50 transition-colors">
                                        <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="https://mystore.com"
                                            value={siteUrl}
                                            onChange={(e) => setSiteUrl(e.target.value)}
                                            required
                                            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                                        Email <span className="normal-case text-gray-600">(optional — for updates)</span>
                                    </label>
                                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#256af4]/50 transition-colors">
                                        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                                        <input
                                            type="email"
                                            placeholder="hello@mystore.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !siteUrl}
                                    className="w-full py-3.5 rounded-xl bg-[#256af4] hover:bg-[#1a4bbd] disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-[#256af4]/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Generate Embed Code
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>

                        {/* Result */}
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-2xl bg-[#0d0d1a] border border-[#256af4]/30 p-6 shadow-[0_0_40px_-10px_rgba(37,106,244,0.2)]"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <h3 className="font-bold text-sm">Your Embed Code</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={result.preview_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-[#256af4] hover:text-blue-300 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Preview
                                            </a>
                                        </div>
                                    </div>

                                    <div className="relative mb-4">
                                        <pre className="bg-black/40 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap border border-white/5">
                                            {result.embed_code}
                                        </pre>
                                        <button
                                            onClick={copyCode}
                                            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#256af4] hover:bg-[#1a4bbd] text-white text-xs font-medium transition-all cursor-pointer"
                                        >
                                            {copied ? (
                                                <><Check className="w-3 h-3" /> Copied!</>
                                            ) : (
                                                <><Copy className="w-3 h-3" /> Copy</>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-[#256af4]/5 border border-[#256af4]/10 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-[#256af4] mb-2">
                                            📋 How to install
                                        </p>
                                        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                                            <li>Copy the code above</li>
                                            <li>Paste it before <code className="text-gray-300">&lt;/body&gt;</code> on every page of your site</li>
                                            <li>A floating 🎙️ mic button will appear — your visitors can start talking!</li>
                                        </ol>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                                        <span>Store ID: <code className="text-gray-400">{result.store_id}</code></span>
                                        <Link href="/dashboard" className="text-[#256af4] hover:text-blue-300 transition-colors flex items-center gap-1">
                                            View Analytics <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column: Feature cards */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-2 space-y-4"
                    >
                        {[
                            {
                                icon: <Zap className="w-5 h-5 text-yellow-400" />,
                                title: "2-Minute Setup",
                                desc: "One script tag. No server required. Works with any website builder.",
                            },
                            {
                                icon: <Mic className="w-5 h-5 text-[#256af4]" />,
                                title: "Real Voice AI",
                                desc: "Powered by ElevenLabs — ultra-low latency, human-quality voice.",
                            },
                            {
                                icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
                                title: "Analytics Dashboard",
                                desc: "Track conversations, sentiment, and conversion in real-time.",
                            },
                            {
                                icon: <Shield className="w-5 h-5 text-purple-400" />,
                                title: "GDPR Compliant",
                                desc: "No cookies. No personal data stored. Fully privacy-safe.",
                            },
                            {
                                icon: <Code2 className="w-5 h-5 text-pink-400" />,
                                title: "Also on Shopify",
                                desc: "Have a Shopify store? Install directly via the Shopify App Store.",
                            },
                        ].map((f) => (
                            <div
                                key={f.title}
                                className="rounded-xl bg-[#0d0d1a] border border-white/5 p-5 hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        {f.icon}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm mb-1">{f.title}</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Shopify CTA */}
                        <div className="rounded-xl bg-gradient-to-br from-[#256af4]/10 to-purple-500/10 border border-[#256af4]/20 p-5">
                            <p className="text-xs font-medium text-[#256af4] mb-1 uppercase tracking-wider">Shopify Store?</p>
                            <p className="text-sm font-bold mb-3">Install via Shopify App</p>
                            <p className="text-xs text-gray-400 mb-4">
                                The Shopify app auto-injects the widget via Theme App Extensions — no code needed.
                            </p>
                            <a
                                href="#"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#256af4] hover:text-blue-300 transition-colors"
                            >
                                View Shopify App <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

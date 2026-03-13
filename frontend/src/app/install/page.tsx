"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowLeft, Globe, Mail, Copy, Check, ExternalLink, Code2, Zap, Shield, BarChart3 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        <div className="min-h-screen bg-canvas text-heading" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {/* Navbar */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-canvas/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 text-muted hover:text-heading transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Mic className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-bold text-sm">SimplifyOps</span>
                    </div>
                    <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-heading transition-colors">
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
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                            Any Website • 2-Minute Setup
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-heading mb-4 leading-tight">
                            Add Voice AI to<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                                Any Website
                            </span>
                        </h1>
                        <p className="text-lg text-muted max-w-xl mx-auto">
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
                            className="rounded-2xl bg-panel border border-white/5 p-6"
                        >
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" />
                                Get Your Embed Code
                            </h2>
                            <form onSubmit={handleInstall} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                                        Website URL *
                                    </label>
                                    <div className="flex items-center gap-2 bg-white/[0.04] border border-edge rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                                        <Globe className="w-4 h-4 text-faint shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="https://mystore.com"
                                            value={siteUrl}
                                            onChange={(e) => setSiteUrl(e.target.value)}
                                            required
                                            className="bg-transparent text-sm text-heading placeholder-faint outline-none flex-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                                        Email <span className="normal-case text-faint">(optional — for updates)</span>
                                    </label>
                                    <div className="flex items-center gap-2 bg-white/[0.04] border border-edge rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                                        <Mail className="w-4 h-4 text-faint shrink-0" />
                                        <input
                                            type="email"
                                            placeholder="hello@mystore.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-transparent text-sm text-heading placeholder-faint outline-none flex-1"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !siteUrl}
                                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
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
                                    className="rounded-2xl bg-panel border border-primary/30 p-6 shadow-[0_0_40px_-10px_oklch(52%_0.22_260/0.2)]"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                            <h3 className="font-bold text-sm">Your Embed Code</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={result.preview_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-300 transition-colors"
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
                                            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-all cursor-pointer"
                                        >
                                            {copied ? (
                                                <><Check className="w-3 h-3" /> Copied!</>
                                            ) : (
                                                <><Copy className="w-3 h-3" /> Copy</>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-primary mb-2">
                                            How to install
                                        </p>
                                        <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                                            <li>Copy the code above</li>
                                            <li>Paste it before <code className="text-body">&lt;/body&gt;</code> on every page of your site</li>
                                            <li>A floating mic button will appear — your visitors can start talking!</li>
                                        </ol>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-faint">
                                        <span>Store ID: <code className="text-muted">{result.store_id}</code></span>
                                        <Link href="/dashboard" className="text-primary hover:text-primary-300 transition-colors flex items-center gap-1">
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
                            { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "2-Minute Setup", desc: "One script tag. No server required. Works with any website builder." },
                            { icon: <Mic className="w-5 h-5 text-primary" />, title: "Real Voice AI", desc: "Powered by ElevenLabs — ultra-low latency, human-quality voice." },
                            { icon: <BarChart3 className="w-5 h-5 text-success" />, title: "Analytics Dashboard", desc: "Track conversations, sentiment, and conversion in real-time." },
                            { icon: <Shield className="w-5 h-5 text-purple-400" />, title: "GDPR Compliant", desc: "No cookies. No personal data stored. Fully privacy-safe." },
                            { icon: <Code2 className="w-5 h-5 text-pink-400" />, title: "Also on Shopify", desc: "Have a Shopify store? Install directly via the Shopify App Store." },
                        ].map((f) => (
                            <div
                                key={f.title}
                                className="rounded-xl bg-panel border border-white/5 p-5 hover:border-edge-strong transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        {f.icon}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm mb-1">{f.title}</p>
                                        <p className="text-xs text-faint leading-relaxed">{f.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Shopify CTA */}
                        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 p-5">
                            <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">Shopify Store?</p>
                            <p className="text-sm font-bold mb-3">Install via Shopify App</p>
                            <p className="text-xs text-muted mb-4">
                                The Shopify app auto-injects the widget via Theme App Extensions — no code needed.
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-faint">
                                Coming soon to Shopify App Store
                            </span>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

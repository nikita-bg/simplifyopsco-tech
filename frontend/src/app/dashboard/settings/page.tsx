"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Mic, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_6401kec12s0ff6hbwjmgdw2s0kt0";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
    const { storeId } = useStore();
    const [copiedScript, setCopiedScript] = useState(false);
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [embedCode, setEmbedCode] = useState("");

    useEffect(() => {
        if (storeId) {
            apiFetch(`/api/install/${storeId}`)
                .then((res) => res.json())
                .then((data) => setEmbedCode(data.embed_code || ""))
                .catch(() => {});
        }
    }, [storeId]);

    const webhookUrl = `${API_URL}/webhook/elevenlabs/post-call`;

    const displayEmbedCode = embedCode || `<script
  src="${API_URL}/widget-embed.js"
  data-store-id="${storeId || "your-store-id"}"
  data-api-url="${API_URL}"
  data-color="#6366f1"
  data-position="bottom-right"
></script>`;

    const handleCopy = async (text: string, setter: (v: boolean) => void) => {
        await navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0a0a14] text-white p-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <div className="max-w-3xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[#256af4] flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Integration Settings</h1>
                        <p className="text-sm text-gray-400">Connect SimplifyOps to your website</p>
                    </div>
                </div>

                {/* Agent Info */}
                <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6 mb-6">
                    <h2 className="font-bold text-sm mb-4 text-gray-300 uppercase tracking-wider">Agent Configuration</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Agent ID</p>
                            <p className="text-sm font-mono text-[#256af4]">{AGENT_ID}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Store ID</p>
                            <p className="text-sm font-mono text-emerald-400">{storeId || "Not connected"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Connection Type</p>
                            <p className="text-sm text-white">WebRTC</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-sm text-emerald-400">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Embed Script */}
                <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Embed Script</h2>
                        <button
                            onClick={() => handleCopy(displayEmbedCode, setCopiedScript)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#256af4]/10 text-[#256af4] text-xs font-medium hover:bg-[#256af4]/20 transition-colors cursor-pointer"
                        >
                            {copiedScript ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Script</>}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Paste this code before the <code className="text-[#256af4]">&lt;/body&gt;</code> tag on your website to activate the voice widget.
                    </p>
                    <pre className="bg-[#1e1e1e] rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto border border-white/10">
                        {displayEmbedCode}
                    </pre>
                </div>

                {/* Webhook URL */}
                <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Webhook URL</h2>
                        <button
                            onClick={() => handleCopy(webhookUrl, setCopiedWebhook)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#256af4]/10 text-[#256af4] text-xs font-medium hover:bg-[#256af4]/20 transition-colors cursor-pointer"
                        >
                            {copiedWebhook ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Set this as the post-call webhook in your ElevenLabs Agent settings to receive conversation data.
                    </p>
                    <div className="bg-[#1e1e1e] rounded-lg p-4 text-sm text-emerald-400 font-mono border border-white/10">
                        POST {webhookUrl}
                    </div>
                </div>

                {/* ElevenLabs Link */}
                <div className="rounded-2xl bg-gradient-to-r from-[#256af4]/10 to-purple-500/10 border border-[#256af4]/20 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold mb-1">Manage Agent in ElevenLabs</h3>
                            <p className="text-sm text-gray-400">Configure voice, prompt, and knowledge base settings</p>
                        </div>
                        <a
                            href="https://elevenlabs.io/app/conversational-ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#256af4] text-white text-sm font-semibold hover:bg-[#1a4bbd] transition-colors"
                        >
                            Open ElevenLabs <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

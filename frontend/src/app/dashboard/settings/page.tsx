"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Mic, ExternalLink, Wifi } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
    const { storeId } = useStore();
    const [copiedScript, setCopiedScript] = useState(false);
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [embedCode, setEmbedCode] = useState("");
    const [agentId, setAgentId] = useState<string>("Loading...");

    useEffect(() => {
        fetch(`${API_URL}/api/voice/config`)
            .then((res) => res.json())
            .then((data) => setAgentId(data.agent_id || "Not configured"))
            .catch(() => setAgentId("Unavailable"));
    }, []);

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
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-heading mb-1">Integration Settings</h1>
                <p className="text-sm text-muted">Connect SimplifyOps to your website</p>
            </div>

            {/* Agent Info */}
            <div className="rounded-2xl bg-raised border border-edge p-6 mb-6">
                <h2 className="font-semibold text-xs mb-4 text-faint uppercase tracking-widest">Agent Configuration</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-canvas rounded-xl p-3 border border-edge">
                        <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Agent ID</p>
                        <p className="text-sm font-mono text-primary truncate">{agentId}</p>
                    </div>
                    <div className="bg-canvas rounded-xl p-3 border border-edge">
                        <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Store ID</p>
                        <p className="text-sm font-mono text-success truncate">{storeId || "Not connected"}</p>
                    </div>
                    <div className="bg-canvas rounded-xl p-3 border border-edge">
                        <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Connection Type</p>
                        <div className="flex items-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-muted" />
                            <p className="text-sm text-heading">WebRTC</p>
                        </div>
                    </div>
                    <div className="bg-canvas rounded-xl p-3 border border-edge">
                        <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Status</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-sm text-success font-medium">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embed Script */}
            <div className="rounded-2xl bg-raised border border-edge p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-xs text-faint uppercase tracking-widest">Embed Script</h2>
                    <button
                        onClick={() => handleCopy(displayEmbedCode, setCopiedScript)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                        {copiedScript ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Script</>}
                    </button>
                </div>
                <p className="text-xs text-muted mb-3">
                    Paste this code before the <code className="text-primary font-mono">&lt;/body&gt;</code> tag on your website to activate the voice widget.
                </p>
                <pre className="bg-overlay rounded-xl p-4 text-xs text-body font-mono overflow-x-auto border border-edge">
                    {displayEmbedCode}
                </pre>
            </div>

            {/* Webhook URL */}
            <div className="rounded-2xl bg-raised border border-edge p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-xs text-faint uppercase tracking-widest">Webhook URL</h2>
                    <button
                        onClick={() => handleCopy(webhookUrl, setCopiedWebhook)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                        {copiedWebhook ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
                    </button>
                </div>
                <p className="text-xs text-muted mb-3">
                    Set this as the post-call webhook in your ElevenLabs Agent settings to receive conversation data.
                </p>
                <div className="bg-overlay rounded-xl p-4 text-sm text-success font-mono border border-edge">
                    POST {webhookUrl}
                </div>
            </div>

            {/* ElevenLabs Link */}
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-heading mb-1">Manage Agent in ElevenLabs</h3>
                        <p className="text-sm text-muted">Configure voice, prompt, and knowledge base settings</p>
                    </div>
                    <a
                        href="https://elevenlabs.io/app/conversational-ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors shrink-0"
                    >
                        Open ElevenLabs <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}

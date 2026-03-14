"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Mic, ExternalLink, Wifi, ShieldCheck, Database, Link as LinkIcon } from "lucide-react";
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
  data-color="#256af4"
  data-position="bottom-right"
></script>`;

    const handleCopy = async (text: string, setter: (v: boolean) => void) => {
        await navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    return (
        <div className="max-w-[1000px] mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-heading mb-1">Integration Settings</h1>
                    <p className="text-sm text-muted">Connect and configure SimplifyOps with your application</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Settings Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Embed Script */}
                    <div className="bg-panel rounded-xl border border-edge overflow-hidden">
                        <div className="p-5 border-b border-edge flex items-center justify-between bg-canvas/30">
                            <div>
                                <h2 className="font-semibold text-sm text-heading flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-primary" />
                                    Web Installation
                                </h2>
                                <p className="text-xs text-muted mt-0.5">Paste this code right before your closing &lt;/body&gt; tag</p>
                            </div>
                            <button
                                onClick={() => handleCopy(displayEmbedCode, setCopiedScript)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-edge text-heading text-xs font-medium hover:bg-white/10 transition-colors"
                            >
                                {copiedScript ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5 text-muted" /> Copy Code</>}
                            </button>
                        </div>
                        <div className="p-5 bg-black/20">
                            <pre className="text-[13px] text-faint font-mono overflow-x-auto leading-relaxed">
                                <code>{displayEmbedCode}</code>
                            </pre>
                        </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="bg-panel rounded-xl border border-edge overflow-hidden">
                        <div className="p-5 border-b border-edge flex items-center justify-between bg-canvas/30">
                            <div>
                                <h2 className="font-semibold text-sm text-heading flex items-center gap-2">
                                    <Database className="w-4 h-4 text-purple-500" />
                                    Post-Call Webhook
                                </h2>
                                <p className="text-xs text-muted mt-0.5">Use this in ElevenLabs to sync conversation data</p>
                            </div>
                            <button
                                onClick={() => handleCopy(webhookUrl, setCopiedWebhook)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-edge text-heading text-xs font-medium hover:bg-white/10 transition-colors"
                            >
                                {copiedWebhook ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5 text-muted" /> Copy URL</>}
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded border border-success/20 shrink-0">POST</span>
                                <code className="text-sm font-mono text-heading flex-1 truncate">{webhookUrl}</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Agent Status */}
                    <div className="bg-panel rounded-xl border border-edge p-5">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-edge">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <h2 className="font-semibold text-sm text-heading">Connection Status</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-[11px] text-muted font-medium mb-1">STORE ID</p>
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-transparent">
                                    <p className="text-sm font-mono text-success truncate">{storeId || "Not connected"}</p>
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-[11px] text-muted font-medium mb-1">AGENT ID</p>
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-transparent">
                                    <p className="text-sm font-mono text-primary truncate">{agentId}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-canvas/50 rounded-lg p-3 border border-edge text-center">
                                    <Wifi className="w-4 h-4 text-muted mx-auto mb-1.5" />
                                    <p className="text-[10px] text-muted font-medium">PROTOCOL</p>
                                    <p className="text-xs text-heading font-semibold mt-0.5">WebRTC</p>
                                </div>
                                <div className="bg-canvas/50 rounded-lg p-3 border border-edge text-center relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-0.5 bg-success" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse mx-auto mb-2 mt-1" />
                                    <p className="text-[10px] text-muted font-medium">STATUS</p>
                                    <p className="text-xs text-success font-semibold mt-0.5">Active</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* External Link */}
                    <div className="bg-gradient-to-br from-primary/10 via-panel to-purple-500/10 rounded-xl border border-primary/20 p-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3 text-primary">
                                <Mic className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-heading text-sm mb-1">ElevenLabs Dashboard</h3>
                            <p className="text-xs text-muted mb-4 leading-relaxed">
                                Fine-tune your AI agent&apos;s voice, personality prompt, and knowledge base.
                            </p>
                            <a
                                href="https://elevenlabs.io/app/conversational-ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white/5 border border-edge text-heading text-xs font-semibold hover:bg-white/10 transition-colors"
                            >
                                Open ElevenLabs <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

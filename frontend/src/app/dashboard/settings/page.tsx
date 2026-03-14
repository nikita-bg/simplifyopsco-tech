"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, ShieldCheck, Link as LinkIcon } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
    const { storeId } = useStore();
    const [copiedScript, setCopiedScript] = useState(false);
    const [embedCode, setEmbedCode] = useState("");
    const [agentStatus, setAgentStatus] = useState<"loading" | "active" | "inactive">("loading");

    useEffect(() => {
        if (!storeId) return;
        apiFetch(`/api/install/${storeId}`)
            .then((res) => res.json())
            .then((data) => {
                setEmbedCode(data.embed_code || "");
                setAgentStatus("active");
            })
            .catch(() => setAgentStatus("inactive"));
    }, [storeId]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(embedCode);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2000);
    };

    return (
        <div className="max-w-[900px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-heading mb-1">Settings</h1>
                <p className="text-sm text-muted">Manage your SimplifyOps integration</p>
            </div>

            <div className="space-y-6">
                {/* Connection Status */}
                <div className="bg-panel rounded-xl border border-edge p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <div>
                            <h2 className="text-sm font-semibold text-heading">Connection Status</h2>
                            <p className="text-xs text-muted mt-0.5">
                                Store ID: <span className="font-mono text-muted">{storeId || "Not connected"}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {agentStatus === "loading" ? (
                            <span className="text-xs text-muted">Checking...</span>
                        ) : agentStatus === "active" ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-xs font-semibold text-success">Active</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-error" />
                                <span className="text-xs font-semibold text-error">Inactive</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Widget Installation */}
                <div className="bg-panel rounded-xl border border-edge overflow-hidden">
                    <div className="p-5 border-b border-edge flex items-center justify-between bg-canvas/30">
                        <div>
                            <h2 className="font-semibold text-sm text-heading flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-primary" />
                                Widget Installation
                            </h2>
                            <p className="text-xs text-muted mt-0.5">
                                Paste this code right before your closing <code className="font-mono text-primary text-[11px]">&lt;/body&gt;</code> tag
                            </p>
                        </div>
                        <button
                            onClick={handleCopy}
                            disabled={!embedCode}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-edge text-heading text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            {copiedScript ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5 text-muted" /> Copy Code</>}
                        </button>
                    </div>
                    <div className="p-5 bg-black/20">
                        <pre className="text-[13px] text-faint font-mono overflow-x-auto leading-relaxed">
                            <code>{embedCode || "Loading embed code..."}</code>
                        </pre>
                    </div>
                </div>

                {/* Help text */}
                <div className="bg-canvas/50 rounded-xl border border-edge p-5">
                    <h3 className="text-sm font-semibold text-heading mb-2">Need help?</h3>
                    <p className="text-xs text-muted leading-relaxed">
                        Once the widget code is installed on your website, your AI voice assistant will automatically appear for visitors.
                        You can customize the assistant&apos;s voice, greeting, and appearance from the <a href="/dashboard/agent-config" className="text-primary hover:underline font-medium">Agent Config</a> page.
                    </p>
                </div>
            </div>
        </div>
    );
}

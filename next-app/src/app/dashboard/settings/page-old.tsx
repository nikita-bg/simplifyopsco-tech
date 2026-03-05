"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
    const [agentId, setAgentId] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load from localStorage
        setAgentId(
            localStorage.getItem("vocalize_agent_id") ||
            process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
            ""
        );
        setWebhookUrl(localStorage.getItem("vocalize_webhook_url") || "");
    }, []);

    const handleSave = () => {
        localStorage.setItem("vocalize_agent_id", agentId);
        localStorage.setItem("vocalize_webhook_url", webhookUrl);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="animate-fade-in space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Configure your AI voice assistant and integrations.
                </p>
            </div>

            {/* Voice Agent Config */}
            <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">graphic_eq</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Voice Agent</h3>
                        <p className="text-xs text-slate-500">ElevenLabs Conversational AI</p>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Agent ID</label>
                    <input
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        placeholder="agent_..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                        Your ElevenLabs Agent ID from the Conversational AI dashboard.
                    </p>
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1.5">
                        n8n Webhook URL (optional)
                    </label>
                    <input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                        Custom n8n webhook for RAG/knowledge base queries.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved
                            ? "bg-green-500/20 text-green-400 border border-green-500/20"
                            : "bg-primary text-white hover:bg-primary-dark"
                        }`}
                >
                    {saved ? "✓ Saved" : "Save Settings"}
                </button>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Integrations</h3>
                <div className="space-y-3">
                    <IntegrationRow
                        icon="database"
                        name="Supabase"
                        status="connected"
                        detail="Conversations, Knowledge Base"
                    />
                    <IntegrationRow
                        icon="smart_toy"
                        name="ElevenLabs"
                        status={agentId ? "connected" : "pending"}
                        detail={agentId ? `Agent: ${agentId.slice(0, 20)}...` : "Configure Agent ID above"}
                    />
                    <IntegrationRow
                        icon="webhook"
                        name="n8n RAG Agent"
                        status={webhookUrl ? "connected" : "optional"}
                        detail="AI chat with knowledge base via n8n"
                    />
                    <IntegrationRow
                        icon="cloud"
                        name="Google Drive Sync"
                        status="connected"
                        detail="Managed via n8n workflow"
                    />
                </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
                <p className="text-xs text-slate-500">
                    These actions are irreversible. Proceed with caution.
                </p>
                <button className="px-4 py-2 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                    Clear All Conversations
                </button>
            </div>
        </div>
    );
}

function IntegrationRow({
    icon,
    name,
    status,
    detail,
}: {
    icon: string;
    name: string;
    status: "connected" | "pending" | "optional";
    detail: string;
}) {
    const statusConfig = {
        connected: { cls: "text-green-400 bg-green-500/20", label: "Connected" },
        pending: { cls: "text-yellow-400 bg-yellow-500/20", label: "Pending" },
        optional: { cls: "text-slate-400 bg-slate-500/20", label: "Optional" },
    };
    const s = statusConfig[status];

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-lg">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{name}</p>
                <p className="text-xs text-slate-500 truncate">{detail}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>
                {s.label}
            </span>
        </div>
    );
}

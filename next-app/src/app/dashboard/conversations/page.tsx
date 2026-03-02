"use client";

import { useCallback, useEffect, useState } from "react";

interface Conversation {
    id: string;
    session_id: string;
    sentiment: string | null;
    sentiment_score: number | null;
    intent: string | null;
    duration_seconds: number;
    turn_count: number;
    is_converted: boolean;
    created_at: string;
}

interface Message {
    id: string;
    role: string;
    content: string;
    created_at: string;
}

function fmtDuration(s: number) {
    if (!s) return "—";
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function sentimentBadge(s: string | null) {
    const map: Record<string, { cls: string; icon: string }> = {
        positive: { cls: "bg-green-500/20 text-green-400", icon: "sentiment_satisfied" },
        negative: { cls: "bg-red-500/20 text-red-400", icon: "sentiment_dissatisfied" },
    };
    const d = map[s || ""] || { cls: "bg-slate-500/20 text-slate-400", icon: "sentiment_neutral" };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${d.cls}`}>
            <span className="material-symbols-outlined text-sm">{d.icon}</span>
            {s || "neutral"}
        </span>
    );
}

export default function ConversationsPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch("/api/conversations/list");
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (err) {
            console.error("Failed to load conversations:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (id: string) => {
        setMsgLoading(true);
        try {
            const res = await fetch(`/api/conversations/messages?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error("Failed to load messages:", err);
        } finally {
            setMsgLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleSelect = (id: string) => {
        setSelectedId(id === selectedId ? null : id);
        if (id !== selectedId) fetchMessages(id);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Conversations</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Full transcripts and metadata from voice and chat conversations.
                    </p>
                </div>
                <button
                    onClick={fetchConversations}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-surface-dark p-5 animate-pulse h-20"
                        />
                    ))}
                </div>
            ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">
                        forum
                    </span>
                    <p className="text-white font-semibold">No conversations yet</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        When visitors use the voice or chat widget, their conversations will appear here
                        with full transcripts and analytics.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {conversations.map((conv) => (
                        <div key={conv.id}>
                            {/* Conversation row */}
                            <button
                                onClick={() => handleSelect(conv.id)}
                                className={`w-full text-left rounded-2xl border bg-surface-dark p-5 transition-all ${selectedId === conv.id
                                        ? "border-primary/50 bg-primary/5"
                                        : "border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white">
                                                {conv.intent
                                                    ? conv.intent.charAt(0).toUpperCase() + conv.intent.slice(1)
                                                    : "General Inquiry"}
                                            </span>
                                            {sentimentBadge(conv.sentiment)}
                                            {conv.is_converted && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                                                    Converted
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {fmtDate(conv.created_at)} · {conv.turn_count} turns ·{" "}
                                            {fmtDuration(conv.duration_seconds)} · #{conv.session_id?.slice(0, 8)}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-500 text-xl transition-transform">
                                        {selectedId === conv.id ? "expand_less" : "expand_more"}
                                    </span>
                                </div>
                            </button>

                            {/* Transcript (collapsed) */}
                            {selectedId === conv.id && (
                                <div className="mt-1 ml-4 rounded-xl border border-white/5 bg-surface-dark/50 p-4 max-h-96 overflow-y-auto">
                                    {msgLoading ? (
                                        <div className="text-sm text-slate-500 text-center py-4">Loading transcript...</div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-sm text-slate-500 text-center py-4">
                                            No messages recorded for this conversation.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                                                                ? "bg-primary text-white rounded-br-md"
                                                                : "bg-white/5 text-slate-200 border border-white/5 rounded-bl-md"
                                                            }`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

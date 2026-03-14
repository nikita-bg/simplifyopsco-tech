"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, TrendingUp, User, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface Conversation {
    id: string;
    session_id: string;
    transcript: string;
    intent: string;
    sentiment: string;
    products_discussed: string[] | null;
    cart_actions: number;
    started_at: string;
    customer_id: string | null;
}

const PAGE_SIZE = 50;

export default function ConversationsPage() {
    const { storeId } = useStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (storeId) fetchConversations(0);
        else setLoading(false);
    }, [storeId]);

    const fetchConversations = async (newOffset: number) => {
        setLoading(true);
        try {
            const res = await apiFetch(
                `/api/conversations?store_id=${storeId}&offset=${newOffset}&limit=${PAGE_SIZE}`,
            );
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
                setTotal(data.total || 0);
                setOffset(newOffset);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case "Very Positive": return "text-success";
            case "Positive": return "text-info";
            case "Neutral": return "text-muted";
            case "Negative": return "text-warning";
            default: return "text-muted";
        }
    };

    const getSentimentBg = (sentiment: string) => {
        switch (sentiment) {
            case "Very Positive": return "bg-success/10 text-success border-success/20";
            case "Positive": return "bg-info/10 text-info border-info/20";
            case "Neutral": return "bg-white/5 text-muted border-white/10";
            case "Negative": return "bg-warning/10 text-warning border-warning/20";
            default: return "bg-white/5 text-muted border-white/10";
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1200px] animate-pulse">
                <div className="mb-6">
                    <div className="h-7 w-40 bg-white/5 rounded-lg mb-2" />
                    <div className="h-4 w-64 bg-white/5 rounded-md" />
                </div>
                <div className="grid lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-1 bg-panel rounded-xl border border-edge overflow-hidden">
                        <div className="p-4 border-b border-edge">
                            <div className="h-4 w-36 bg-white/5 rounded" />
                        </div>
                        <div className="p-3 space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="p-3 rounded-lg bg-white/[0.02]">
                                    <div className="flex justify-between mb-2">
                                        <div className="h-3.5 w-28 bg-white/5 rounded" />
                                        <div className="h-4 w-16 bg-white/5 rounded" />
                                    </div>
                                    <div className="h-3 w-24 bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-panel rounded-xl border border-edge flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full mx-auto mb-4" />
                            <div className="h-4 w-40 bg-white/5 rounded mx-auto mb-2" />
                            <div className="h-3 w-56 bg-white/5 rounded mx-auto" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px]">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-heading mb-1">Conversations</h1>
                    <p className="text-sm text-muted">View and analyze customer voice interactions</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Conversations List */}
                <div className="lg:col-span-1 bg-panel rounded-xl border border-edge overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
                    <div className="p-4 border-b border-edge bg-canvas/30">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-heading">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            All Conversations ({total})
                        </h2>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto min-h-0">
                        {conversations.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center">
                                <MessageSquare className="w-8 h-8 text-muted mb-3 opacity-50" />
                                <p className="text-muted text-sm font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {conversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConv(conv)}
                                        className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer border ${
                                            selectedConv?.id === conv.id
                                                ? "bg-primary/10 border-primary/30 shadow-sm"
                                                : "bg-white/[0.02] hover:bg-white/[0.05] border-transparent"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <span className="text-sm font-medium truncate text-heading leading-tight">{conv.intent || "Unknown Intent"}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold tracking-wide uppercase ${getSentimentBg(conv.sentiment)}`}>
                                                {conv.sentiment}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted uppercase tracking-wider">
                                            <Clock className="w-3 h-3" />
                                            {new Date(conv.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div className="p-3 border-t border-edge bg-canvas/30 flex items-center justify-between">
                            <button
                                onClick={() => fetchConversations(offset - PAGE_SIZE)}
                                disabled={currentPage <= 1}
                                className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-md disabled:opacity-30 transition-all cursor-pointer text-heading border border-edge"
                            >
                                Prev
                            </button>
                            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => fetchConversations(offset + PAGE_SIZE)}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-md disabled:opacity-30 transition-all cursor-pointer text-heading border border-edge"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Conversation Details */}
                <div className="lg:col-span-2 bg-panel rounded-xl border border-edge overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
                    {selectedConv ? (
                        <div className="h-full flex flex-col">
                            <div className="p-5 border-b border-edge bg-canvas/30">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-heading mb-1.5 leading-tight">{selectedConv.intent || "Conversation"}</h2>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-faint" />
                                                {new Date(selectedConv.started_at).toLocaleString()}
                                            </span>
                                            {selectedConv.customer_id && (
                                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded">
                                                    <User className="w-4 h-4 text-faint" />
                                                    <span className="font-mono text-xs">{selectedConv.customer_id}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wide shrink-0 ${getSentimentBg(selectedConv.sentiment)}`}>
                                        {selectedConv.sentiment}
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 rounded-lg p-3 border border-edge flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <ShoppingCart className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                             <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Cart Actions</p>
                                             <p className="text-xl font-bold text-heading leading-tight mt-0.5">{selectedConv.cart_actions}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3 border border-edge flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-5 h-5 text-success" />
                                        </div>
                                        <div>
                                             <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Products Discussed</p>
                                            <p className="text-xl font-bold text-heading leading-tight mt-0.5">
                                                {selectedConv.products_discussed?.length || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 overflow-y-auto">
                                {/* Products */}
                                {selectedConv.products_discussed && selectedConv.products_discussed.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold text-heading uppercase tracking-wider mb-3">Products Discussed</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedConv.products_discussed.map((product, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2.5 py-1 bg-primary/10 text-primary rounded text-[13px] font-medium border border-primary/20"
                                                >
                                                    {product}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transcript */}
                                <div>
                                    <h3 className="text-xs font-semibold text-heading uppercase tracking-wider mb-3">Transcript</h3>
                                    <div className="bg-canvas/50 rounded-lg p-4 border border-edge">
                                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-muted font-mono">
                                            {selectedConv.transcript || <span className="italic text-faint">No transcript available for this conversation.</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-muted opacity-50" />
                            </div>
                            <h3 className="text-heading font-medium mb-1">Select a Conversation</h3>
                            <p className="text-muted text-sm max-w-xs mx-auto">Click on any conversation in the list to view its transcript, sentiment, and cart actions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

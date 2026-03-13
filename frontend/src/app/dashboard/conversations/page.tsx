"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageSquare, Clock, TrendingUp, User, ShoppingCart } from "lucide-react";
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
            case "Very Positive": return "text-green-400";
            case "Positive": return "text-blue-400";
            case "Neutral": return "text-gray-400";
            case "Negative": return "text-orange-400";
            default: return "text-gray-400";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1">Conversations</h1>
                <p className="text-sm text-gray-400">View and analyze customer voice interactions</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Conversations List */}
                <div className="lg:col-span-1 bg-panel rounded-xl border border-white/5 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        All Conversations ({total})
                    </h2>
                    {conversations.length === 0 ? (
                        <p className="text-gray-500 text-sm">No conversations yet</p>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConv(conv)}
                                    className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer ${
                                        selectedConv?.id === conv.id
                                            ? "bg-blue-600/20 border border-blue-500/30"
                                            : "bg-white/5 hover:bg-white/10 border border-white/5"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="text-sm font-medium truncate">{conv.intent || "Unknown Intent"}</span>
                                        <span className={`text-xs ${getSentimentColor(conv.sentiment)}`}>
                                            {conv.sentiment}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        {new Date(conv.started_at).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                            <button
                                onClick={() => fetchConversations(offset - PAGE_SIZE)}
                                disabled={currentPage <= 1}
                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-500">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => fetchConversations(offset + PAGE_SIZE)}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Conversation Details */}
                <div className="lg:col-span-2 bg-panel rounded-xl border border-white/5 p-6">
                    {selectedConv ? (
                        <div>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold mb-1">{selectedConv.intent || "Conversation"}</h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(selectedConv.started_at).toLocaleString()}
                                        </span>
                                        {selectedConv.customer_id && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-4 h-4" />
                                                {selectedConv.customer_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedConv.sentiment)}`}>
                                    {selectedConv.sentiment}
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingCart className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-gray-400">Cart Actions</span>
                                    </div>
                                    <p className="text-2xl font-bold">{selectedConv.cart_actions}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-gray-400">Products Discussed</span>
                                    </div>
                                    <p className="text-2xl font-bold">
                                        {selectedConv.products_discussed?.length || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Products */}
                            {selectedConv.products_discussed && selectedConv.products_discussed.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Products Discussed</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedConv.products_discussed.map((product, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm border border-blue-500/30"
                                            >
                                                {product}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Transcript */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3">Transcript</h3>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/5 max-h-96 overflow-y-auto">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedConv.transcript || "No transcript available"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a conversation to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

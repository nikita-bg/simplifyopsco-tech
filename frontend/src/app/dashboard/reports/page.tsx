"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Users, MessageSquare, ShoppingCart, BarChart3, PieChart } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface DashboardStats {
    total_conversations: number;
    avg_lead_score: number;
    conversion_rate: number;
    top_intents: { intent: string; count: number }[];
}

interface SentimentData {
    sentiment: string;
    count: number;
}

interface ReportInsights {
    avg_duration: number;
    avg_products: number;
    cart_abandonment_rate: number;
    unique_users: number;
}

export default function ReportsPage() {
    const { storeId } = useStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
    const [insights, setInsights] = useState<ReportInsights | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (storeId) fetchReports();
        else setLoading(false);
    }, [storeId]);

    const fetchReports = async () => {
        try {
            const [statsRes, sentimentRes, insightsRes] = await Promise.all([
                apiFetch(`/api/dashboard/${storeId}/stats`),
                apiFetch("/api/reports/sentiment"),
                apiFetch(`/api/stores/${storeId}/reports/insights`),
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats({
                    total_conversations: data.total_conversations ?? data.total_calls ?? 0,
                    avg_lead_score: data.avg_lead_score ?? 0,
                    conversion_rate: data.conversion_rate ?? 0,
                    top_intents: data.top_intents ?? data.intent_data ?? [],
                });
            }

            if (sentimentRes.ok) {
                const data = await sentimentRes.json();
                setSentimentData(data.sentiment_distribution || []);
            }

            if (insightsRes.ok) {
                const data = await insightsRes.json();
                setInsights(data);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case "Very Positive": return "bg-green-500";
            case "Positive": return "bg-blue-500";
            case "Neutral": return "bg-gray-500";
            case "Negative": return "bg-orange-500";
            default: return "bg-gray-500";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const totalSentiment = sentimentData.reduce((sum, item) => sum + item.count, 0);

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1">Analytics & Reports</h1>
                <p className="text-sm text-gray-400">Insights into your voice AI performance</p>
            </div>

            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-400">Total Conversations</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.total_conversations || 0}</p>
                </div>

                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-sm text-gray-400">Avg Lead Score</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.avg_lead_score?.toFixed(1) || "0.0"}/10</p>
                </div>

                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-400">Conversion Rate</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.conversion_rate || 0}%</p>
                </div>

                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-sm text-gray-400">Unique Users</span>
                    </div>
                    <p className="text-3xl font-bold">{insights?.unique_users ?? 0}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Intents */}
                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">Top Customer Intents</h2>
                    </div>
                    {stats?.top_intents && stats.top_intents.length > 0 ? (
                        <div className="space-y-4">
                            {stats.top_intents.map((item, idx) => {
                                const maxCount = stats.top_intents[0]?.count || 1;
                                const percentage = (item.count / maxCount) * 100;
                                return (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">{item.intent || "Unknown"}</span>
                                            <span className="text-sm text-gray-400">{item.count} conversations</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No intent data available</p>
                    )}
                </div>

                {/* Sentiment Distribution */}
                <div className="bg-panel rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-green-400" />
                        <h2 className="text-lg font-semibold">Sentiment Distribution</h2>
                    </div>
                    {sentimentData.length > 0 ? (
                        <div className="space-y-4">
                            {sentimentData.map((item, idx) => {
                                const percentage = totalSentiment > 0 ? (item.count / totalSentiment) * 100 : 0;
                                return (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${getSentimentColor(item.sentiment)}`} />
                                                <span className="text-sm font-medium">{item.sentiment}</span>
                                            </div>
                                            <span className="text-sm text-gray-400">
                                                {item.count} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`${getSentimentColor(item.sentiment)} h-full rounded-full transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No sentiment data available</p>
                    )}
                </div>
            </div>

            {/* Performance Insights */}
            <div className="mt-6 bg-panel rounded-xl border border-white/5 p-6">
                <h2 className="text-lg font-semibold mb-4">Performance Insights</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <p className="text-sm text-gray-400 mb-1">Avg Conversation Duration</p>
                        <p className="text-2xl font-bold">{insights?.avg_duration ?? 0} min</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <p className="text-sm text-gray-400 mb-1">Products per Conversation</p>
                        <p className="text-2xl font-bold">{insights?.avg_products ?? 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <p className="text-sm text-gray-400 mb-1">Cart Abandonment Rate</p>
                        <p className="text-2xl font-bold">{insights?.cart_abandonment_rate ?? 0}%</p>
                    </div>
                </div>
            </div>
        </>
    );
}

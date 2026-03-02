"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Analytics {
    total: number;
    converted: number;
    conversionRate: number;
    avgDuration: number;
    avgSentimentScore: number | null;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    intentDistribution: { intent: string; count: number }[];
    timeline: { date: string; count: number }[];
    recent: {
        id: string;
        sessionId: string;
        sentiment: string | null;
        intent: string | null;
        duration: number;
        turnCount: number;
        isConverted: boolean;
        createdAt: string;
    }[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDuration(secs: number) {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function sentimentColor(s: string | null) {
    if (s === "positive") return "text-green-400";
    if (s === "negative") return "text-red-400";
    return "text-slate-400";
}

function sentimentIcon(s: string | null) {
    if (s === "positive") return "sentiment_satisfied";
    if (s === "negative") return "sentiment_dissatisfied";
    return "sentiment_neutral";
}

/* ─── Mini bar chart ─────────────────────────────────────────────────────── */
function TimelineChart({ timeline }: { timeline: { date: string; count: number }[] }) {
    const max = Math.max(...timeline.map((t) => t.count), 1);
    return (
        <div className="flex items-end gap-1 h-40">
            {timeline.map((t) => {
                const pct = (t.count / max) * 100;
                const label = new Date(t.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                });
                return (
                    <div
                        key={t.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block text-xs bg-slate-800 border border-white/10 rounded px-2 py-1 whitespace-nowrap z-10">
                            {label}: {t.count}
                        </div>
                        <div
                            className="w-full rounded-t bg-primary/60 hover:bg-primary transition-all"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Sentiment donut ring (CSS only) ───────────────────────────────────── */
function SentimentRing({
    breakdown,
    total,
}: {
    breakdown: { positive: number; neutral: number; negative: number };
    total: number;
}) {
    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                No data yet
            </div>
        );
    }

    const pos = Math.round((breakdown.positive / total) * 100);
    const neg = Math.round((breakdown.negative / total) * 100);
    const neu = 100 - pos - neg;

    const items = [
        { label: "Positive", pct: pos, color: "bg-green-400" },
        { label: "Neutral", pct: neu, color: "bg-slate-400" },
        { label: "Negative", pct: neg, color: "bg-red-400" },
    ];

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-medium">{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${item.color} transition-all duration-700`}
                            style={{ width: `${item.pct}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/analytics");
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
        // Refresh every 30s for near-real-time updates
        const interval = setInterval(fetchAnalytics, 30_000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="animate-fade-in space-y-8">
                <SkeletonGrid />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <span className="material-symbols-outlined text-5xl text-red-400">error</span>
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    const d = data!;
    const sentimentLabel =
        d.total === 0
            ? "—"
            : d.avgSentimentScore != null
                ? `${(d.avgSentimentScore * 100).toFixed(0)}%`
                : `${Math.round((d.sentimentBreakdown.positive / d.total) * 100)}% pos`;

    return (
        <div className="animate-fade-in space-y-8">
            {/* Live badge */}
            <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    Live • updates every 30s
                </div>
            </div>

            {/* ── Stat Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="forum"
                    label="Total Conversations"
                    value={d.total === 0 ? "0" : d.total.toLocaleString()}
                    change={d.total === 0 ? "Start a conversation" : `${d.total} total`}
                    changeType={d.total > 0 ? "positive" : "neutral"}
                />
                <StatCard
                    icon="sentiment_satisfied"
                    label="Avg. Sentiment"
                    value={sentimentLabel}
                    change={
                        d.total === 0
                            ? "No data yet"
                            : `${d.sentimentBreakdown.positive} positive`
                    }
                    changeType={d.sentimentBreakdown.positive > d.sentimentBreakdown.negative ? "positive" : "neutral"}
                />
                <StatCard
                    icon="conversion_path"
                    label="Conversion Rate"
                    value={d.total === 0 ? "—" : `${d.conversionRate}%`}
                    change={d.converted > 0 ? `${d.converted} converted` : "No conversions yet"}
                    changeType={d.conversionRate > 10 ? "positive" : "neutral"}
                />
                <StatCard
                    icon="timer"
                    label="Avg. Duration"
                    value={fmtDuration(d.avgDuration)}
                    change={d.total === 0 ? "No calls yet" : "per conversation"}
                    changeType="neutral"
                />
            </div>

            {/* ── Charts ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline */}
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            Conversations (Last 14 days)
                        </h3>
                        <span className="text-xs text-slate-500">{d.total} total</span>
                    </div>
                    {d.total === 0 ? (
                        <EmptyChart icon="show_chart" label="No conversations yet" />
                    ) : (
                        <TimelineChart timeline={d.timeline} />
                    )}
                </div>

                {/* Sentiment */}
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">
                        Sentiment Breakdown
                    </h3>
                    <SentimentRing breakdown={d.sentimentBreakdown} total={d.total} />
                    {d.total > 0 && (
                        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: "Positive", val: d.sentimentBreakdown.positive, cls: "text-green-400" },
                                { label: "Neutral", val: d.sentimentBreakdown.neutral, cls: "text-slate-400" },
                                { label: "Negative", val: d.sentimentBreakdown.negative, cls: "text-red-400" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl bg-white/5 p-3">
                                    <p className={`text-xl font-bold ${s.cls}`}>{s.val}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Intent + Recent ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Intent Distribution */}
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Intent Distribution
                    </h3>
                    {d.intentDistribution.length === 0 ? (
                        <EmptyChart icon="category" label="No intent data yet" />
                    ) : (
                        <div className="space-y-3">
                            {d.intentDistribution.map((item) => {
                                const topCount = d.intentDistribution[0]?.count || 1;
                                const pct = Math.round((item.count / topCount) * 100);
                                return (
                                    <div key={item.intent}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-300 capitalize">{item.intent}</span>
                                            <span className="text-white font-medium">{item.count}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5">
                                            <div
                                                className="h-full rounded-full bg-primary/70 transition-all duration-700"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Conversations */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-surface-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                            Recent Conversations
                        </h3>
                        <button
                            onClick={fetchAnalytics}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <span className="material-symbols-outlined text-xl">refresh</span>
                        </button>
                    </div>

                    {d.recent.length === 0 ? (
                        <EmptyChart
                            icon="chat_bubble"
                            label="No conversations yet. Click the voice icon to start."
                        />
                    ) : (
                        <div className="space-y-2">
                            {d.recent.map((conv) => (
                                <div
                                    key={conv.id}
                                    className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    {/* Sentiment icon */}
                                    <span
                                        className={`material-symbols-outlined text-2xl ${sentimentColor(conv.sentiment)}`}
                                    >
                                        {sentimentIcon(conv.sentiment)}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-white font-medium truncate">
                                                {conv.intent ? conv.intent.charAt(0).toUpperCase() + conv.intent.slice(1) : "General inquiry"}
                                            </span>
                                            {conv.isConverted && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                    Converted
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {fmtDate(conv.createdAt)} · {conv.turnCount} turns · {fmtDuration(conv.duration)}
                                        </p>
                                    </div>

                                    <span className="text-xs text-slate-600">
                                        #{conv.sessionId?.slice(0, 8)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function EmptyChart({ icon, label }: { icon: string; label: string }) {
    return (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">
                    {icon}
                </span>
                <p>{label}</p>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    change,
    changeType,
}: {
    icon: string;
    label: string;
    value: string;
    change: string;
    changeType: "positive" | "negative" | "neutral";
}) {
    const changeColors = {
        positive: "text-green-400",
        negative: "text-red-400",
        neutral: "text-slate-500",
    };
    return (
        <div className="rounded-2xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-surface-dark p-5 animate-pulse">
                        <div className="h-10 w-10 rounded-lg bg-white/5 mb-3" />
                        <div className="h-3 w-20 rounded bg-white/5 mb-2" />
                        <div className="h-7 w-16 rounded bg-white/5" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-surface-dark p-6 h-64 animate-pulse" />
                ))}
            </div>
        </div>
    );
}

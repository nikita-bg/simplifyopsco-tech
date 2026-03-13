"use client";

import React, { useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import {
    Phone, TrendingUp, Star, Loader2, MessageSquare, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const INTENT_COLORS = ["oklch(60% 0.2 260)", "oklch(55% 0.2 300)", "oklch(65% 0.18 160)", "oklch(75% 0.16 80)", "oklch(60% 0.22 25)"];

const FALLBACK = {
    total_calls: 0,
    avg_lead_score: 0,
    conversion_rate: 0,
    call_data: [
        { name: "Mon", calls: 0 }, { name: "Tue", calls: 0 }, { name: "Wed", calls: 0 },
        { name: "Thu", calls: 0 }, { name: "Fri", calls: 0 }, { name: "Sat", calls: 0 }, { name: "Sun", calls: 0 },
    ],
    intent_data: [],
    recent_conversations: [],
};

interface DashboardData {
    total_calls: number;
    avg_lead_score: number;
    conversion_rate: number;
    call_data: { name: string; calls: number }[];
    intent_data: { name: string; value: number }[];
    recent_conversations: { caller_id: string; time_ago: string; duration: string; sentiment: string; status: string }[];
}

export function ClientDashboard({ storeId }: { storeId: string }) {
    const [data, setData] = useState<DashboardData>(FALLBACK);
    const [loading, setLoading] = useState(true);
    const [backendOnline, setBackendOnline] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiFetch(`/api/dashboard/${storeId}/stats`, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    const json = await res.json();
                    setData({ ...FALLBACK, ...json });
                    setBackendOnline(true);
                }
            } catch {
                console.warn("Backend unreachable, using fallback data");
                setBackendOnline(false);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [storeId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            {/* Page header */}
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-heading">Dashboard Overview</h1>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${backendOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success animate-pulse" : "bg-warning"}`} />
                        {backendOnline ? "Live" : "Offline"}
                    </div>
                </div>
                <p className="text-sm text-muted mt-1">Monitor your AI voice assistant performance</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                <StatCard
                    title="Total Calls"
                    value={(data.total_calls ?? 0).toLocaleString()}
                    icon={<Phone className="w-5 h-5" />}
                    color="primary"
                />
                <StatCard
                    title="Avg. Lead Score"
                    value={String(data.avg_lead_score ?? 0)}
                    suffix="/10"
                    icon={<Star className="w-5 h-5" />}
                    color="warning"
                />
                <StatCard
                    title="Conversion Rate"
                    value={String(data.conversion_rate ?? 0)}
                    suffix="%"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="success"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                {/* Call Volume Chart */}
                <div className="rounded-2xl bg-raised border border-edge p-6">
                    <div className="mb-6">
                        <h3 className="font-semibold text-heading text-sm mb-1">Call Volume</h3>
                        <p className="text-xs text-faint">Sessions per day of week</p>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.call_data}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(52% 0.22 260)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="oklch(52% 0.22 260)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.01 270)" vertical={false} />
                                <XAxis dataKey="name" stroke="oklch(35% 0.01 270)" tick={{ fontSize: 11 }} />
                                <YAxis stroke="oklch(35% 0.01 270)" tick={{ fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "oklch(13% 0.015 265)",
                                        borderColor: "oklch(22% 0.01 270)",
                                        borderRadius: 12,
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                    }}
                                    labelStyle={{ color: "oklch(65% 0.01 270)" }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="oklch(52% 0.22 260)" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Intent Breakdown */}
                <div className="rounded-2xl bg-raised border border-edge p-6">
                    <div className="mb-6">
                        <h3 className="font-semibold text-heading text-sm mb-1">User Intent Breakdown</h3>
                        <p className="text-xs text-faint">Primary topics discussed</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="h-44 w-44 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.intent_data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                                        {data.intent_data.map((entry, i) => (
                                            <Cell key={entry.name} fill={INTENT_COLORS[i % INTENT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-3">
                            {data.intent_data.map((entry, i) => (
                                <div key={entry.name} className="flex items-center gap-2.5 text-sm">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTENT_COLORS[i % INTENT_COLORS.length] }} />
                                    <span className="text-muted">{entry.name}</span>
                                    <span className="text-heading font-semibold ml-auto">{entry.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Conversations Table */}
            <div className="rounded-2xl bg-raised border border-edge p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-heading">Recent AI Conversations</h3>
                    <Link href="/dashboard/conversations" className="text-xs text-primary hover:text-primary-400 font-medium flex items-center gap-1 transition-colors">
                        View all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>

                {data.recent_conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-10 h-10 text-faint mx-auto mb-3 opacity-40" />
                        <p className="text-muted text-sm">No conversations yet</p>
                        <p className="text-faint text-xs mt-1">Connect your store and start engaging visitors</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[11px] text-faint border-b border-edge uppercase tracking-wider">
                                    <th className="text-left pb-3 font-medium">Caller ID</th>
                                    <th className="text-left pb-3 font-medium">Time</th>
                                    <th className="text-left pb-3 font-medium">Duration</th>
                                    <th className="text-left pb-3 font-medium">Sentiment</th>
                                    <th className="text-left pb-3 font-medium">Status</th>
                                    <th className="text-left pb-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_conversations.map((c, i) => (
                                    <tr key={i} className="border-b border-edge/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 text-sm font-medium flex items-center gap-2 text-heading">
                                            <Phone className="w-3.5 h-3.5 text-faint" />
                                            {c.caller_id}
                                        </td>
                                        <td className="py-4 text-sm text-muted">{c.time_ago}</td>
                                        <td className="py-4 text-sm text-muted">{c.duration}</td>
                                        <td className="py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.sentiment === "Very Positive" ? "bg-success/10 text-success" :
                                                    c.sentiment === "Positive" ? "bg-info/10 text-info" :
                                                        c.sentiment === "Negative" ? "bg-error/10 text-error" :
                                                            "bg-white/5 text-muted"
                                                }`}>{c.sentiment}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.status === "Qualified" ? "bg-primary/10 text-primary" :
                                                    c.status === "Rejected" ? "bg-error/10 text-error" :
                                                        "bg-warning/10 text-warning"
                                                }`}>{c.status}</span>
                                        </td>
                                        <td className="py-4">
                                            <Link href="/dashboard/conversations" className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

function StatCard({ title, value, suffix, icon, color }: {
    title: string; value: string; suffix?: string; icon: React.ReactNode; color: "primary" | "warning" | "success";
}) {
    const colorMap = {
        primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
        warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
        success: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
    };
    const c = colorMap[color];

    return (
        <div className={`rounded-2xl bg-raised border border-edge p-6 hover:border-edge-strong transition-all group`}>
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-faint font-medium uppercase tracking-wider">{title}</p>
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.text}`}>{icon}</div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-heading">{value}</span>
                {suffix && <span className="text-lg text-faint">{suffix}</span>}
            </div>
        </div>
    );
}

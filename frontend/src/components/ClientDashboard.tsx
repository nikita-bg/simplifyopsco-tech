"use client";

import React, { useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import {
    Phone, TrendingUp, Star, Search, Loader2, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const INTENT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

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
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl sm:text-2xl font-bold">Dashboard Overview</h1>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${backendOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-yellow-400"}`} />
                        {backendOnline ? "Live" : "Offline"}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input placeholder="Search data..." className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-40" />
                    </div>
                    <Link href="/" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                        Back to Site
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                <StatCard title="Total Calls" value={(data.total_calls ?? 0).toLocaleString()} icon={<Phone className="w-5 h-5 text-blue-400" />} />
                <StatCard title="Avg. Lead Score" value={String(data.avg_lead_score ?? 0)} suffix="/10" icon={<Star className="w-5 h-5 text-yellow-400" />} />
                <StatCard title="Conversion Rate" value={String(data.conversion_rate ?? 0)} suffix="%" icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                {/* Call Volume Chart */}
                <div className="rounded-2xl bg-panel border border-white/5 p-6">
                    <div className="mb-6">
                        <h3 className="font-bold text-sm mb-1">Call Volume</h3>
                        <p className="text-xs text-gray-500">Sessions per day of week</p>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.call_data}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(52% 0.22 260)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="oklch(52% 0.22 260)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                                <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#555" tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333", borderRadius: 8 }} />
                                <Area type="monotone" dataKey="calls" stroke="oklch(52% 0.22 260)" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Intent Breakdown */}
                <div className="rounded-2xl bg-panel border border-white/5 p-6">
                    <div className="mb-6">
                        <h3 className="font-bold text-sm mb-1">User Intent Breakdown</h3>
                        <p className="text-xs text-gray-500">Primary topics discussed</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="h-44 w-44">
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
                                    <span className="text-gray-400">{entry.name}</span>
                                    <span className="text-white font-semibold ml-auto">{entry.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Conversations Table */}
            <div className="rounded-2xl bg-panel border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Recent AI Conversations</h3>
                    <span className="text-xs text-gray-500">{data.recent_conversations.length} records</span>
                </div>

                {data.recent_conversations.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No conversations yet. Connect your store and start engaging visitors.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 border-b border-white/5">
                                    <th className="text-left pb-3 font-medium">CALLER ID</th>
                                    <th className="text-left pb-3 font-medium">TIME</th>
                                    <th className="text-left pb-3 font-medium">DURATION</th>
                                    <th className="text-left pb-3 font-medium">SENTIMENT</th>
                                    <th className="text-left pb-3 font-medium">STATUS</th>
                                    <th className="text-left pb-3 font-medium">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_conversations.map((c, i) => (
                                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 text-sm font-medium flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                                            {c.caller_id}
                                        </td>
                                        <td className="py-4 text-sm text-gray-400">{c.time_ago}</td>
                                        <td className="py-4 text-sm text-gray-400">{c.duration}</td>
                                        <td className="py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.sentiment === "Very Positive" ? "bg-emerald-500/10 text-emerald-400" :
                                                    c.sentiment === "Positive" ? "bg-green-500/10 text-green-400" :
                                                        c.sentiment === "Negative" ? "bg-red-500/10 text-red-400" :
                                                            "bg-gray-500/10 text-gray-400"
                                                }`}>{c.sentiment}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.status === "Qualified" ? "bg-blue-500/10 text-blue-400" :
                                                    c.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                                                        "bg-yellow-500/10 text-yellow-400"
                                                }`}>{c.status}</span>
                                        </td>
                                        <td className="py-4">
                                            <Link href="/dashboard/conversations" className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
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

function StatCard({ title, value, suffix, icon }: {
    title: string; value: string; suffix?: string; icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-panel border border-white/5 p-6 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold">{value}</span>
                {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
            </div>
        </div>
    );
}

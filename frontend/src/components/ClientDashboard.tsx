"use client";

import React, { useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import {
    Phone, TrendingUp, Star, Loader2, MessageSquare, ArrowUpRight, CheckCircle2,
    XCircle, AlertCircle, PhoneIncoming, Clock,
    MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const INTENT_COLORS = ["#256af4", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e"];

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
        <div className="max-w-[1200px] mx-auto">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-heading">Overview</h1>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${backendOnline ? "border-success/20 bg-success/5 text-success" : "border-warning/20 bg-warning/5 text-warning"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success animate-pulse" : "bg-warning"}`} />
                            {backendOnline ? "Live" : "Offline"}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/settings" className="px-3 py-1.5 border border-edge bg-panel rounded-md text-sm font-medium hover:bg-white/5 transition-colors">
                        Configure
                    </Link>
                </div>
            </div>

            {/* KPI Cards - 2 Column Layout with inline Micro-charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Micro Chart 1: Volume */}
                <div className="bg-panel rounded-xl p-5 border border-edge flex items-center justify-between relative overflow-hidden group">
                    <div className="z-10 bg-panel/50 backdrop-blur-sm p-1 pr-4 rounded-r-xl">
                        <p className="text-xs text-muted font-medium mb-1 flex items-center gap-1.5"><PhoneIncoming className="w-3.5 h-3.5" /> Total Calls</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-heading">{(data.total_calls ?? 0).toLocaleString()}</span>
                            <span className="text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded text-[10px]">+12%</span>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.call_data}>
                                <Area type="monotone" dataKey="calls" stroke="#256af4" strokeWidth={2} fillOpacity={0.1} fill="#256af4" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Micro Chart 2: Conversion */}
                <div className="bg-panel rounded-xl p-5 border border-edge flex items-center justify-between relative overflow-hidden group">
                    <div className="z-10">
                        <p className="text-xs text-muted font-medium mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Setup Conversion</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-heading">{data.conversion_rate ?? 0}%</span>
                            <span className="text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded text-[10px]">+2.4%</span>
                        </div>
                    </div>
                    {/* Tiny inline donut */}
                    <div className="w-20 h-20 -mr-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{value: data.conversion_rate ?? 0}, {value: 100 - (data.conversion_rate ?? 0)}]} cx="50%" cy="50%" innerRadius={25} outerRadius={35} dataKey="value" stroke="none">
                                    <Cell fill="#10b981" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-panel rounded-xl border border-edge p-5">
                    <div className="mb-4">
                        <h3 className="font-semibold text-heading text-sm">Call Activity</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.call_data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#256af4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#256af4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#52525b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#18181b",
                                        borderColor: "rgba(255,255,255,0.06)",
                                        borderRadius: 8,
                                        fontSize: 12,
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                    }}
                                    itemStyle={{ color: "#fafafa" }}
                                    labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#256af4" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Intent Breakdown */}
                <div className="bg-panel rounded-xl border border-edge p-5 flex flex-col">
                    <h3 className="font-semibold text-heading text-sm mb-4">Topic Breakdown</h3>
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="h-40 w-full relative">
                            {(!data.intent_data || data.intent_data.length === 0) ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-32 rounded-full border-4 border-white/5 border-dashed animate-spin-slow" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data.intent_data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                                            {data.intent_data.map((entry, i) => (
                                                <Cell key={entry.name} fill={INTENT_COLORS[i % INTENT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "#18181b", borderColor: "rgba(255,255,255,0.06)", borderRadius: 6, fontSize: 12 }}
                                            itemStyle={{ color: "#fafafa" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex flex-col gap-2.5">
                            {data.intent_data?.slice(0, 3).map((entry, i) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full hidden sm:block" style={{ backgroundColor: INTENT_COLORS[i % INTENT_COLORS.length] }} />
                                    <span className="text-muted truncate flex-1" title={entry.name}>{entry.name}</span>
                                    <span className="text-heading font-medium">{entry.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Conversations Table */}
            <div className="bg-panel rounded-xl border border-edge overflow-hidden">
                <div className="p-4 border-b border-edge flex items-center justify-between">
                    <h3 className="font-semibold text-heading text-sm">Recent Interactions</h3>
                    <Link href="/dashboard/conversations" className="text-xs text-muted hover:text-primary font-medium flex items-center gap-1 transition-colors">
                        View all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>

                {data.recent_conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-8 h-8 text-faint mx-auto mb-3 opacity-40" />
                        <p className="text-muted text-sm font-medium">No recent activity</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-faint uppercase tracking-wider bg-canvas/30">
                                    <th className="px-4 py-3 font-medium">Caller</th>
                                    <th className="px-4 py-3 font-medium">Time / Duration</th>
                                    <th className="px-4 py-3 font-medium text-center">Outcome</th>
                                    <th className="px-4 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_conversations.map((c, i) => (
                                    <tr key={i} className="border-t border-edge/30 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                                    <Phone className="w-3 h-3" />
                                                </div>
                                                <span className="text-sm text-heading font-medium truncate w-24 sm:w-32 block" title={c.caller_id}>{c.caller_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] text-muted">{c.time_ago}</span>
                                                <span className="text-[11px] text-faint flex items-center gap-1"><Clock className="w-3 h-3" /> {c.duration}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Sentiment Icon Tag */}
                                                <div className="w-6 h-6 rounded flex items-center justify-center" title={`Sentiment: ${c.sentiment}`}>
                                                    {c.sentiment === "Very Positive" || c.sentiment === "Positive" ? (
                                                        <span className="text-success bg-success/10 p-1 rounded-full"><TrendingUp className="w-3 h-3" /></span>
                                                    ) : c.sentiment === "Negative" ? (
                                                        <span className="text-error bg-error/10 p-1 rounded-full"><TrendingUp className="w-3 h-3 rotate-180" /></span>
                                                    ) : (
                                                        <span className="text-muted bg-white/5 p-1 rounded-full"><TrendingUp className="w-3 h-3" /></span>
                                                    )}
                                                </div>
                                                {/* Status Icon Tag */}
                                                <div className="w-6 h-6 rounded flex items-center justify-center" title={`Status: ${c.status}`}>
                                                    {c.status === "Qualified" ? (
                                                        <span className="text-primary bg-primary/10 p-1 rounded"><CheckCircle2 className="w-3 h-3" /></span>
                                                    ) : c.status === "Rejected" ? (
                                                        <span className="text-error bg-error/10 p-1 rounded"><XCircle className="w-3 h-3" /></span>
                                                    ) : (
                                                        <span className="text-warning bg-warning/10 p-1 rounded"><AlertCircle className="w-3 h-3" /></span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end">
                                                <button className="p-1.5 text-faint hover:text-heading hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}


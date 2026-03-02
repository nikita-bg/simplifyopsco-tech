"use client";

import React, { useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import {
    PieChart as PieIcon, MessageSquare, Users, BarChart3, Settings, HelpCircle, Phone, TrendingUp, Star, Search, Mic, Loader2,
} from "lucide-react";
import Link from "next/link";

const INTENT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Fallback static data
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

const navItems = [
    { label: "Overview", icon: PieIcon, active: true },
    { label: "Conversations", icon: MessageSquare, active: false },
    { label: "Leads", icon: Users, active: false },
    { label: "Reports", icon: BarChart3, active: false },
];

const bottomNav = [
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    { label: "Support", icon: HelpCircle },
];

export function ClientDashboard() {
    const [activeNav, setActiveNav] = useState("Overview");
    const [data, setData] = useState<DashboardData>(FALLBACK);
    const [loading, setLoading] = useState(true);
    const [backendOnline, setBackendOnline] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_URL}/api/dashboard/stats`, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
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
        // Re-fetch every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex bg-[#0a0a14] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {/* Sidebar */}
            <aside className="w-60 bg-[#0d0d1a] border-r border-white/5 flex flex-col py-6 px-4 shrink-0">
                <div className="flex items-center gap-2.5 px-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-[#256af4] flex items-center justify-center">
                        <Mic className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">AI Voice Copilot</p>
                        <p className="text-[10px] text-gray-500">Client Dashboard</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveNav(item.label)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeNav === item.label
                                    ? "bg-[#256af4] text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-1 border-t border-white/5 pt-4 mt-4">
                    {bottomNav.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href || "#"}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-auto">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${backendOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-yellow-400"}`} />
                            {backendOnline ? "Live" : "Offline"}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input placeholder="Search data..." className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-40" />
                        </div>
                        <Link href="/" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                            Back to Site
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="w-8 h-8 animate-spin text-[#256af4]" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-3 gap-5 mb-8">
                            <StatCard title="Total Calls" value={data.total_calls.toLocaleString()} icon={<Phone className="w-5 h-5 text-blue-400" />} trend="+18%" trendLabel="vs last month" />
                            <StatCard title="Avg. Lead Score" value={String(data.avg_lead_score)} suffix="/10" icon={<Star className="w-5 h-5 text-yellow-400" />} trend="+2.1%" trendLabel="vs last month" />
                            <StatCard title="Conversion Rate" value={String(data.conversion_rate)} suffix="%" icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} trend="+0.8%" trendLabel="vs last month" />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-2 gap-5 mb-8">
                            {/* Call Durations Chart */}
                            <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-sm mb-1">Call Volume</h3>
                                        <p className="text-xs text-gray-500">Sessions per day of week</p>
                                    </div>
                                </div>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.call_data}>
                                            <defs>
                                                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#256af4" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#256af4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                                            <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                                            <YAxis stroke="#555" tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333", borderRadius: 8 }} />
                                            <Area type="monotone" dataKey="calls" stroke="#256af4" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* User Intent Breakdown */}
                            <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-sm mb-1">User Intent Breakdown</h3>
                                        <p className="text-xs text-gray-500">Primary topics discussed</p>
                                    </div>
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
                        <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Recent AI Conversations</h3>
                                <span className="text-xs text-gray-500">{data.recent_conversations.length} records</span>
                            </div>

                            {data.recent_conversations.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No conversations yet. Start the FastAPI backend to see live data.</p>
                            ) : (
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
                                                    <button className="w-7 h-7 rounded-full bg-[#256af4]/10 hover:bg-[#256af4]/20 flex items-center justify-center transition-colors cursor-pointer">
                                                        <MessageSquare className="w-3.5 h-3.5 text-[#256af4]" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

function StatCard({ title, value, suffix, icon, trend, trendLabel }: {
    title: string; value: string; suffix?: string; icon: React.ReactNode; trend: string; trendLabel: string;
}) {
    return (
        <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-6 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold">{value}</span>
                {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-emerald-400 font-medium">{trend}</span>
                <span className="text-xs text-gray-600">{trendLabel}</span>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  MessageSquare,
  Clock,
  Timer,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface OverviewData {
  total_conversations: number;
  prev_total_conversations: number;
  avg_duration_seconds: number;
  prev_avg_duration_seconds: number;
  total_duration_seconds: number;
  period: string;
}

interface IntentItem {
  intent: string;
  count: number;
}

interface IntentsData {
  intents: IntentItem[];
  period: string;
}

interface HourItem {
  hour: number;
  count: number;
}

interface PeakHoursData {
  hours: HourItem[];
  period: string;
}

interface UnansweredQuestion {
  intent: string;
  summary: string;
  date: string;
}

interface UnansweredData {
  questions: UnansweredQuestion[];
  total: number;
  period: string;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function formatHoursDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
}

function trendPercent(current: number, prev: number): number {
  return Math.round(((current - prev) / (prev || 1)) * 100);
}

type Period = "7d" | "30d" | "90d";

const PERIODS: { label: string; value: Period }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

export default function ReportsPage() {
  const { storeId } = useStore();
  const [period, setPeriod] = useState<Period>("7d");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [intents, setIntents] = useState<IntentsData | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHoursData | null>(null);
  const [unanswered, setUnanswered] = useState<UnansweredData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [overviewRes, intentsRes, peakRes, unansweredRes] =
          await Promise.all([
            apiFetch(
              `/api/analytics/overview?store_id=${storeId}&period=${period}`
            ),
            apiFetch(
              `/api/analytics/intents?store_id=${storeId}&period=${period}`
            ),
            apiFetch(
              `/api/analytics/peak-hours?store_id=${storeId}&period=${period}`
            ),
            apiFetch(
              `/api/analytics/unanswered?store_id=${storeId}&period=${period}`
            ),
          ]);

        if (cancelled) return;

        if (overviewRes.ok) setOverview(await overviewRes.json());
        if (intentsRes.ok) setIntents(await intentsRes.json());
        if (peakRes.ok) setPeakHours(await peakRes.json());
        if (unansweredRes.ok) setUnanswered(await unansweredRes.json());
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [storeId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const convTrend = trendPercent(
    overview?.total_conversations ?? 0,
    overview?.prev_total_conversations ?? 0
  );
  const durTrend = trendPercent(
    overview?.avg_duration_seconds ?? 0,
    overview?.prev_avg_duration_seconds ?? 0
  );

  const TrendArrow = ({ value }: { value: number }) => {
    if (value > 0)
      return (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
          <ArrowUpRight className="w-3 h-3" />+{value}%
        </span>
      );
    if (value < 0)
      return (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-error bg-error/10 px-1.5 py-0.5 rounded">
          <ArrowDownRight className="w-3 h-3" />
          {value}%
        </span>
      );
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-muted bg-white/5 px-1.5 py-0.5 rounded">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  const maxIntentCount =
    intents?.intents && intents.intents.length > 0
      ? intents.intents[0].count
      : 1;

  const displayedQuestions = unanswered?.questions?.slice(0, 20) ?? [];

  return (
    <div className="max-w-[1200px]">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading mb-1">Analytics</h1>
          <p className="text-sm text-muted">
            Insights into your voice AI performance
          </p>
        </div>
        <div className="flex bg-black/20 rounded-lg p-1 border border-edge">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                period === p.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-heading hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Conversations */}
        <div className="bg-panel rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-heading leading-none">
              {overview?.total_conversations ?? 0}
            </p>
            <TrendArrow value={convTrend} />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-panel rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
             <span className="text-xs font-semibold text-muted uppercase tracking-wider">Avg Duration</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-heading leading-none">
              {formatDuration(overview?.avg_duration_seconds ?? 0)}
            </p>
            <TrendArrow value={durTrend} />
          </div>
        </div>

        {/* Total Duration */}
        <div className="bg-panel rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Duration</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-heading leading-none">
                {formatHoursDuration(overview?.total_duration_seconds ?? 0)}
              </p>
          </div>
        </div>

        {/* Unanswered Questions */}
        <div className="bg-panel rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
             <span className="text-xs font-semibold text-muted uppercase tracking-wider">Unanswered</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-orange-400 leading-none">
                {unanswered?.total ?? 0}
              </p>
          </div>
        </div>
      </div>

      {/* Two-column: Peak Hours + Top Intents */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Peak Hours Chart */}
        <div className="bg-panel rounded-xl border border-edge overflow-hidden flex flex-col">
          <div className="p-5 border-b border-edge flex items-center justify-between bg-canvas/30">
            <h2 className="font-semibold text-sm text-heading flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Peak Usage Hours
            </h2>
          </div>
          <div className="p-5 flex-1 min-h-[300px]">
              {peakHours?.hours && peakHours.hours.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours.hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickFormatter={(h: number) => `${h}:00`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#181b21",
                        border: "1px solid #2a2d35",
                        borderRadius: 8,
                        color: "#e5e7eb",
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      labelFormatter={(h) => `${h}:00 - ${Number(h) + 1}:00`}
                      cursor={{ fill: "rgba(37, 106, 244, 0.1)" }}
                    />
                    <Bar dataKey="count" fill="#256af4" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted text-sm border border-dashed border-edge rounded-lg">No peak hours data available</div>
              )}
          </div>
        </div>

        {/* Top Intents */}
        <div className="bg-panel rounded-xl border border-edge overflow-hidden flex flex-col">
           <div className="p-5 border-b border-edge flex items-center justify-between bg-canvas/30">
            <h2 className="font-semibold text-sm text-heading flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Top Customer Intents
            </h2>
          </div>
          <div className="p-5 flex-1">
              {intents?.intents && intents.intents.length > 0 ? (
                <div className="space-y-5">
                  {intents.intents.slice(0, 8).map((item, idx) => {
                    const percentage = (item.count / maxIntentCount) * 100;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-heading">
                            {item.intent || "Unknown"}
                          </span>
                          <span className="text-xs font-semibold text-muted">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full min-h-[250px] flex items-center justify-center text-muted text-sm border border-dashed border-edge rounded-lg">No intent data available</div>
              )}
          </div>
        </div>
      </div>

      {/* Unanswered Questions Section */}
      <div className="bg-panel rounded-xl border border-edge overflow-hidden">
        <div className="p-5 border-b border-edge flex items-center gap-2 bg-canvas/30">
          <HelpCircle className="w-4 h-4 text-orange-400" />
          <h2 className="font-semibold text-sm text-heading">
            Unanswered Questions
          </h2>
          {(unanswered?.total ?? 0) > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {unanswered?.total}
            </span>
          )}
        </div>

        {displayedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-medium text-heading">All questions answered!</p>
            <p className="text-xs text-muted mt-1">Your agent is handling everything flawlessly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-edge bg-canvas/10 text-xs text-muted">
                    <th className="p-4 font-medium">Intent</th>
                    <th className="p-4 font-medium">Summary</th>
                    <th className="p-4 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {displayedQuestions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4 align-top">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-white/5 text-xs font-medium text-heading border border-edge">
                            {q.intent || "Unknown"}
                            </span>
                        </td>
                        <td className="p-4 w-full">
                             <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                                {q.summary}
                            </p>
                        </td>
                        <td className="p-4 align-top text-right">
                             <span className="text-xs text-faint whitespace-nowrap">
                                {timeAgo(q.date)}
                            </span>
                        </td>
                    </tr>
                  ))}
               </tbody>
             </table>
            {(unanswered?.total ?? 0) > 20 && (
              <div className="p-4 border-t border-edge text-center bg-canvas/10">
                  <p className="text-xs font-medium text-muted">
                    Showing 20 of {unanswered?.total} questions
                  </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

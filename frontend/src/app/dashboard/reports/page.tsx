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
        <span className="flex items-center gap-0.5 text-xs font-medium text-green-400">
          <ArrowUpRight className="w-3.5 h-3.5" />+{value}%
        </span>
      );
    if (value < 0)
      return (
        <span className="flex items-center gap-0.5 text-xs font-medium text-red-400">
          <ArrowDownRight className="w-3.5 h-3.5" />
          {value}%
        </span>
      );
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <Minus className="w-3.5 h-3.5" />
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
    <>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-heading mb-1">Analytics</h1>
          <p className="text-sm text-muted">
            Insights into your voice AI performance
          </p>
        </div>
        <div className="flex bg-canvas rounded-full border border-edge p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                period === p.value
                  ? "bg-primary text-white"
                  : "text-muted hover:text-heading"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Conversations */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted">Total Conversations</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-heading">
              {overview?.total_conversations ?? 0}
            </p>
            <TrendArrow value={convTrend} />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-muted">Avg Duration</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-heading">
              {formatDuration(overview?.avg_duration_seconds ?? 0)}
            </p>
            <TrendArrow value={durTrend} />
          </div>
        </div>

        {/* Total Duration */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-muted">Total Duration</span>
          </div>
          <p className="text-3xl font-bold text-heading">
            {formatHoursDuration(overview?.total_duration_seconds ?? 0)}
          </p>
        </div>

        {/* Unanswered Questions */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm text-muted">Unanswered Questions</span>
          </div>
          <p className="text-3xl font-bold text-orange-400">
            {unanswered?.total ?? 0}
          </p>
        </div>
      </div>

      {/* Two-column: Peak Hours + Top Intents */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Peak Hours Chart */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-heading">
              Peak Usage Hours
            </h2>
          </div>
          {peakHours?.hours && peakHours.hours.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={peakHours.hours}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickFormatter={(h: number) => `${h}:00`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#181b21",
                    border: "1px solid #2a2d35",
                    borderRadius: 8,
                    color: "#e5e7eb",
                  }}
                  labelFormatter={(h) => `${h}:00 - ${Number(h) + 1}:00`}
                  cursor={{ fill: "rgba(37, 106, 244, 0.1)" }}
                />
                <Bar dataKey="count" fill="#256af4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-faint text-sm">No peak hours data available</p>
          )}
        </div>

        {/* Top Intents */}
        <div className="bg-raised rounded-2xl border border-edge p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-heading">
              Top Customer Intents
            </h2>
          </div>
          {intents?.intents && intents.intents.length > 0 ? (
            <div className="space-y-4">
              {intents.intents.slice(0, 10).map((item, idx) => {
                const percentage = (item.count / maxIntentCount) * 100;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-heading">
                        {item.intent || "Unknown"}
                      </span>
                      <span className="text-xs text-faint">
                        {item.count} conversations
                      </span>
                    </div>
                    <div className="w-full bg-canvas rounded-full h-2 overflow-hidden">
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
            <p className="text-faint text-sm">No intent data available</p>
          )}
        </div>
      </div>

      {/* Unanswered Questions Section */}
      <div className="bg-raised rounded-2xl border border-edge p-6">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-orange-400" />
          <h2 className="text-base font-semibold text-heading">
            Unanswered Questions
          </h2>
          {(unanswered?.total ?? 0) > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400">
              {unanswered?.total}
            </span>
          )}
        </div>

        {displayedQuestions.length === 0 ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-sm text-muted">
              No unanswered questions — your agent is handling everything!
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-edge">
              {displayedQuestions.map((q, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading">
                        {q.intent || "Unknown Intent"}
                      </p>
                      <p className="text-sm text-muted mt-0.5 truncate">
                        {q.summary}
                      </p>
                    </div>
                    <span className="text-xs text-faint whitespace-nowrap">
                      {timeAgo(q.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {(unanswered?.total ?? 0) > 20 && (
              <p className="text-xs text-faint mt-4 text-center">
                Showing 20 of {unanswered?.total}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

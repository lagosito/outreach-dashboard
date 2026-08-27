"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";

interface DashboardData {
  weeklyTrend: { week: string; count: number }[];
  sentWeekly: { week: string; count: number }[];
  estadoDist: { name: string; value: number }[];
}

interface AnalyticsChartsProps {
  refreshKey: number;
}

const COLORS = [
  "#6d5cff",
  "#8b7aff",
  "#a898ff",
  "#c5b6ff",
  "#d4c8ff",
  "#e3dbff",
];

const PIE_COLORS = [
  "#6d5cff",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-3 shadow-xl">
        <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {entry.name}:
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-3 shadow-xl">
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
          {entry.name}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Leads:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {entry.value}
          </span>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {entry.payload.percent > 0
            ? `${(entry.payload.percent * 100).toFixed(1)}%`
            : "0%"}
        </p>
      </div>
    );
  }
  return null;
}

export function AnalyticsCharts({ refreshKey }: AnalyticsChartsProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData({
            weeklyTrend: json.weeklyTrend,
            sentWeekly: json.sentWeekly,
            estadoDist: json.estadoDist,
          });
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 animate-pulse"
          >
            <div className="h-5 bg-[var(--bg-tertiary)] rounded w-40 mb-4" />
            <div className="h-48 bg-[var(--bg-tertiary)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const mergedData = data.weeklyTrend.map((week) => {
    const sentEntry = data.sentWeekly.find((s) => s.week === week.week);
    return {
      ...week,
      enviados: sentEntry?.count ?? 0,
      semana: `${new Date(week.week).getDate()}/${new Date(week.week).getMonth() + 1}`,
    };
  });

  return (
    <div className="pt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area Chart - Weekly Leads Trend */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Leads Nuevos por Semana
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6d5cff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6d5cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-primary)"
                  vertical={false}
                />
                <XAxis
                  dataKey="semana"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Leads nuevos"
                  stroke="#6d5cff"
                  strokeWidth={2}
                  fill="url(#colorLeads)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Sent vs Responded */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Emails Enviados por Semana
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mergedData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-primary)"
                  vertical={false}
                />
                <XAxis
                  dataKey="semana"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="enviados"
                  name="Emails enviados"
                  fill="#8b7aff"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart - Estado Distribution */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Distribución por Estado
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.estadoDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={600}
                  >
                    {data.estadoDist.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {data.estadoDist.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {entry.name}
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)] ml-auto">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

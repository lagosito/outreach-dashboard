"use client";

import { useEffect, useState } from "react";

interface FunnelData {
  estado: string;
  count: number;
}

interface FunnelChartProps {
  refreshKey: number;
}

const PIPELINE_ESTADOS = [
  "Nuevo",
  "Investigado",
  "Contacto encontrado",
  "FU1 Draft listo",
  "Enviado",
  "Follow-up 1",
  "Follow-up 2",
  "Respondió",
];

const COLORS = [
  "#3b82f6",
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#a855f7",
  "#a855f7",
  "#a855f7",
  "#22c55e",
];

export function FunnelChart({ refreshKey }: FunnelChartProps) {
  const [data, setData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json.funnel);
        }
      } catch (err) {
        console.error("Failed to fetch funnel data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="pt-4 space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--bg-tertiary)] rounded" />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalActive = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="pt-4">
      <div className="space-y-2">
        {PIPELINE_ESTADOS.map((estado, index) => {
          const item = data.find((d) => d.estado === estado);
          const count = item?.count ?? 0;
          const percentage = (count / maxCount) * 100;
          const overallPercentage = totalActive > 0
            ? ((count / totalActive) * 100).toFixed(1)
            : "0";

          return (
            <div
              key={estado}
              className="funnel-bar group"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-2 w-48 shrink-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {estado}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)] w-10 text-right shrink-0">
                  {count}
                </span>
                <span className="text-xs text-[var(--text-muted)] w-12 text-right shrink-0 hidden sm:inline">
                  {overallPercentage}%
                </span>
              </div>
              <div className="ml-6 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: COLORS[index],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border-primary)] grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {totalActive}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total in Pipeline</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {totalActive > 0
              ? (((data.find((d) => d.estado === "Respondió")?.count ?? 0) /
                  totalActive) *
                  100)
              : 0}
            %
          </p>
          <p className="text-xs text-[var(--text-muted)]">Conversion Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {totalActive > 0
              ? (((data.find((d) => d.estado === "Investigado")?.count ?? 0) /
                  totalActive) *
                  100)
              : 0}
            %
          </p>
          <p className="text-xs text-[var(--text-muted)]">Research Rate</p>
        </div>
      </div>
    </div>
  );
}

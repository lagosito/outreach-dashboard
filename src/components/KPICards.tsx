"use client";

import { useEffect, useState } from "react";
import { Users, Mail, FileText, Send, Reply, TrendingUp, TrendingDown, XCircle } from "lucide-react";

interface KPIData {
  totalLeads: number;
  emailFound: number;
  draftsReady: number;
  sent: number;
  responded: number;
  descartado: number;
  conversionRate: number;
  growthRate: number;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  color: string;
  suffix?: string;
}

function KPICard({ title, value, icon, trend, color, suffix }: KPICardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 hover:border-[var(--border-secondary)] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {value.toLocaleString("es-ES")}
            {suffix && suffix !== "%" && <span className="text-sm text-[var(--text-muted)] ml-1">{suffix}</span>}
          </p>
          {suffix === "%" && <span className="text-sm text-[var(--text-muted)]">%</span>}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-[var(--danger)]" />
          )}
          <span className={`text-xs font-medium ${trend >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
          <span className="text-xs text-[var(--text-muted)]">vs periodo anterior</span>
        </div>
      )}
    </div>
  );
}

interface KPICardsProps {
  refreshKey: number;
}

export function KPICards({ refreshKey }: KPICardsProps) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json.kpis);
        }
      } catch (err) {
        console.error("Failed to fetch KPIs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16 mb-2" />
            <div className="h-7 bg-[var(--bg-tertiary)] rounded w-12 mb-2" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard
        title="Total Leads"
        value={data.totalLeads}
        icon={<Users className="w-4 h-4 text-white" />}
        color="bg-[var(--accent)]"
        trend={data.growthRate}
      />
      <KPICard
        title="Email Encontrado"
        value={data.emailFound}
        icon={<Mail className="w-4 h-4 text-white" />}
        color="bg-[var(--info)]"
      />
      <KPICard
        title="Draft Listo"
        value={data.draftsReady}
        icon={<FileText className="w-4 h-4 text-white" />}
        color="bg-[var(--warning)]"
      />
      <KPICard
        title="Enviado"
        value={data.sent}
        icon={<Send className="w-4 h-4 text-white" />}
        color="bg-purple-600"
      />
      <KPICard
        title="Respondió"
        value={data.responded}
        icon={<Reply className="w-4 h-4 text-white" />}
        color="bg-[var(--success)]"
        suffix="%"
        trend={data.conversionRate}
      />
      <KPICard
        title="Descartados"
        value={data.descartado}
        icon={<XCircle className="w-4 h-4 text-white" />}
        color="bg-red-600"
      />
    </div>
  );
}

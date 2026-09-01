"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { KPICards } from "@/components/KPICards";
import { FunnelChart } from "@/components/FunnelChart";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { DataTable } from "@/components/DataTable";
import { Filters } from "@/components/Filters";
import { Accordion } from "@/components/Accordion";

interface FilterState {
  search: string;
  estado: string;
  emailStatus: string;
  dateFrom: string;
  dateTo: string;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    estado: "all",
    emailStatus: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setLastUpdated(new Date());
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-200">
        <Header lastUpdated={lastUpdated} onRefresh={handleRefresh} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <KPICards refreshKey={refreshKey} />
          <Accordion title="Pipeline Conversion" subtitle="Lead distribution by stage">
            <FunnelChart refreshKey={refreshKey} />
          </Accordion>
          <Accordion title="Análisis de Tendencias" subtitle="Evolución semanal del pipeline">
            <AnalyticsCharts refreshKey={refreshKey} />
          </Accordion>
          <Filters filters={filters} onFilterChange={handleFilterChange} />
          <DataTable key={refreshKey} filters={filters} onFilterChange={handleFilterChange} />
        </main>
      </div>
    </ThemeProvider>
  );
}

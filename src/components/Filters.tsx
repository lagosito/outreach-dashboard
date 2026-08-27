"use client";

import { Search, Filter, Calendar } from "lucide-react";

interface FiltersProps {
  filters: {
    search: string;
    estado: string;
    emailStatus: string;
    dateFrom: string;
    dateTo: string;
  };
  onFilterChange: (key: keyof FiltersProps["filters"], value: string) => void;
}

const ESTADOS = [
  { value: "all", label: "Todos los estados" },
  { value: "Nuevo", label: "Nuevo" },
  { value: "Investigado", label: "Investigado" },
  { value: "Contacto encontrado", label: "Contacto encontrado" },
  { value: "Draft listo", label: "Draft listo" },
  { value: "Enviado", label: "Enviado" },
  { value: "Respondió", label: "Respondió" },
  { value: "Descartado", label: "Descartado" },
];

const EMAIL_STATUSES = [
  { value: "all", label: "Todos los emails" },
  { value: "found", label: "Con email" },
  { value: "missing", label: "Sin email" },
];

export function Filters({ filters, onFilterChange }: FiltersProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Filtros
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar empresa, contacto, cargo..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Estado filter */}
        <select
          value={filters.estado}
          onChange={(e) => onFilterChange("estado", e.target.value)}
          className="sm:w-44 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>

        {/* Email status filter */}
        <select
          value={filters.emailStatus}
          onChange={(e) => onFilterChange("emailStatus", e.target.value)}
          className="sm:w-36 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
        >
          {EMAIL_STATUSES.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
            placeholder="Desde"
          />
          <span className="text-xs text-[var(--text-muted)]">–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-colors"
            placeholder="Hasta"
          />
        </div>
      </div>
    </div>
  );
}

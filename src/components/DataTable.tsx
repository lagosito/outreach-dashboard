"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Mail,
  AlertTriangle,
  Briefcase,
  Copy,
  Check,
  Send,
} from "lucide-react";

interface Contact {
  id: string;
  empresa: string;
  cargo: string;
  job_link: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_linkedin: string;
  estado: string;
  email_draft: string;
  hipotesis: string;
  fecha_envio: string | null;
  fecha_followup_1: string | null;
  fecha_followup_2: string | null;
  gmail_thread_id: string;
  created_at: string;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  search: string;
  estado: string;
  emailStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface DataTableProps {
  filters: Filters;
}

type SortField = "empresa" | "cargo" | "contacto_nombre" | "estado" | "created_at" | "fecha_envio";

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Investigado: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  "Contacto encontrado": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "FU1 Draft listo": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Draft listo": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Enviado: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Follow-up 1": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Follow-up 2": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Respondió: "bg-green-500/15 text-green-400 border-green-500/20",
  Handoff: "bg-green-500/15 text-green-400 border-green-500/20",
  "Cerrado sin respuesta": "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Descartado: "bg-red-500/15 text-red-400 border-red-500/20",
};

function EstadoBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COLORS[estado] || "bg-gray-500/15 text-gray-400 border-gray-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {estado}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DataTable({ filters }: DataTableProps) {
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortField,
        sortOrder,
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.estado && filters.estado !== "all") params.set("estado", filters.estado);
      if (filters.emailStatus && filters.emailStatus !== "all")
        params.set("emailStatus", filters.emailStatus);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortField, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleDiscard = async (id: string) => {
    setDiscardingId(id);
    try {
      await fetch("/api/contacts/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to discard contact:", err);
    } finally {
      setDiscardingId(null);
    }
  };

  const handleCopyDraft = async (id: string, draft: string) => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-primary)]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)]" />
    );
  };

  if (loading && !data) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="p-6 animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-[var(--bg-tertiary)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Lead Directory
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {data?.total ?? 0} records
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-primary)]">
              <th className="w-8" />
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                onClick={() => handleSort("empresa")}
              >
                <div className="flex items-center gap-1">
                  Empresa <SortIcon field="empresa" />
                </div>
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                onClick={() => handleSort("cargo")}
              >
                <div className="flex items-center gap-1">
                  Cargo <SortIcon field="cargo" />
                </div>
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                onClick={() => handleSort("contacto_nombre")}
              >
                <div className="flex items-center gap-1">
                  Contacto <SortIcon field="contacto_nombre" />
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">
                Email
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                onClick={() => handleSort("estado")}
              >
                <div className="flex items-center gap-1">
                  Estado <SortIcon field="estado" />
                </div>
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors hidden lg:table-cell"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Fecha <SortIcon field="created_at" />
                </div>
              </th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {data?.contacts.map((contact) => {
              const isExpanded = expandedId === contact.id;
              return (
                <>
                  <tr
                    key={contact.id}
                    className={`border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${
                      contact.estado === "Descartado" ? "opacity-50" : ""
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                  >
                    <td className="px-4 py-3">
                      <ChevronRight
                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {contact.empresa}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {contact.cargo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {contact.contacto_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {contact.contacto_email && contact.contacto_email.trim() ? (
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {contact.contacto_email}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={contact.estado} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(contact.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(contact.id);
                        }}
                        disabled={contact.estado === "Descartado" || discardingId === contact.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Descartar lead"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--danger)]" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-4 py-0">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl mb-3 mx-2 p-5 space-y-4 animate-[fadeIn_0.2s_ease-out] shadow-sm">
                          {/* Hipotesis */}
                          <div>
                            <h4 className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1.5">
                              Hypothesis
                            </h4>
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                              {contact.hipotesis || "No hypothesis defined"}
                            </p>
                          </div>

                          {/* Email Draft */}
                          {contact.email_draft && contact.email_draft.trim() && (
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1.5">
                                Email Draft
                              </h4>
                              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4 text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-mono">
                                {contact.email_draft}
                              </div>
                            </div>
                          )}

                          {/* Dates */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-[var(--border-primary)]">
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                Created
                              </h4>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {formatDateTime(contact.created_at)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                Sent
                              </h4>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {formatDate(contact.fecha_envio)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                Follow-up 1
                              </h4>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {formatDate(contact.fecha_followup_1)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                Follow-up 2
                              </h4>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {formatDate(contact.fecha_followup_2)}
                              </p>
                            </div>
                          </div>

                          {/* Action links */}
                          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-primary)]">
                            {contact.job_link && contact.job_link.trim() && (
                              <a
                                href={contact.job_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--info)] hover:underline"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                View job posting
                              </a>
                            )}
                            {contact.email_draft && contact.email_draft.trim() && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyDraft(contact.id, contact.email_draft);
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)] hover:underline"
                              >
                                {copiedId === contact.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy email draft
                                  </>
                                )}
                              </button>
                            )}
                            {contact.contacto_email && contact.contacto_email.trim() && (
                              <a
                                href={`mailto:${contact.contacto_email}?cc=gabriel@makehappen.de&subject=${encodeURIComponent(`Re: ${contact.cargo} at ${contact.empresa}`)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--info)] hover:underline"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Send email
                              </a>
                            )}
                            {contact.contacto_linkedin && contact.contacto_linkedin.trim() && (
                              <a
                                href={contact.contacto_linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Message on LinkedIn
                              </a>
                            )}
                            {contact.gmail_thread_id && contact.gmail_thread_id.trim() && (
                              <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Thread: {contact.gmail_thread_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}

            {(!data?.contacts || data.contacts.length === 0) && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    No leads found with the selected filters
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[var(--border-primary)] flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {(data.page - 1) * data.limit + 1}–
            {Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page === 1}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              let pageNum: number;
              if (data.totalPages <= 5) {
                pageNum = i + 1;
              } else if (data.page <= 3) {
                pageNum = i + 1;
              } else if (data.page >= data.totalPages - 2) {
                pageNum = data.totalPages - 4 + i;
              } else {
                pageNum = data.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    data.page === pageNum
                      ? "bg-[var(--accent)] text-white"
                      : "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page === data.totalPages}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

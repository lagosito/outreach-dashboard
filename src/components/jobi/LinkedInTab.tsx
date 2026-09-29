"use client";

import { Check, Copy, ExternalLink, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  LINKEDIN_STATUS_LABEL,
  LINKEDIN_STATUS_PILL,
  initials,
  scoreColor,
  shortDate,
  sourceLabel,
  type LinkedInCounts,
  type LinkedInRow,
} from "@/lib/jobi";
import { DEMO_POSTS, type DemoLinkedInRow } from "@/lib/linkedin-demo";
import { copyText, useToast } from "./Toast";
import { SearchField, SegControl, SelectField, StripCard } from "./fields";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "draft_ready", label: "Borrador listo" },
  { value: "published", label: "Publicado" },
  { value: "discarded", label: "Descartado" },
];

const EMPTY_COUNTS: LinkedInCounts = {
  posts: 0,
  draft_ready: 0,
  published: 0,
  avg_score: 0,
  queue: 0,
};

type Row = LinkedInRow & { demo?: boolean };

export function LinkedInTab({
  onCounts,
  refreshKey = 0,
}: {
  onCounts: (counts: LinkedInCounts) => void;
  refreshKey?: number;
}) {
  const notify = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pub, setPub] = useState("todos");
  const [estado, setEstado] = useState("");
  const [score, setScore] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [queue, setQueue] = useState<LinkedInRow[]>([]);
  const [counts, setCounts] = useState<LinkedInCounts>(EMPTY_COUNTS);
  const [overrides, setOverrides] = useState<Record<string, Partial<Row>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  const search = useDeferredValue(q).trim().toLowerCase();
  const countsRef = useRef(onCounts);
  countsRef.current = onCounts;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("search", q.trim());
    if (pub !== "todos") params.set("publicado", pub);
    if (estado) params.set("status", estado);
    if (score) params.set("scoreMin", String(score));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/linkedin?${params.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRows(data.rows || []);
      setQueue(data.queue || []);
      const next = { ...EMPTY_COUNTS, ...(data.counts || {}) };
      setCounts(next);
      countsRef.current(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [q, pub, estado, score, from, to]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const demo = !failed && counts.posts === 0;

  const sourceRows: Row[] = useMemo(() => {
    const base: Row[] = demo
      ? DEMO_POSTS.map((row: DemoLinkedInRow) => ({
          ...row,
          ...(overrides[row.id] || {}),
        }))
      : rows.map((row) => ({ ...row, ...(overrides[row.id] || {}) }));
    return base;
  }, [demo, rows, overrides]);

  const visibleRows = useMemo(
    () =>
      sourceRows.filter((row) => {
        if (pub === "si" && row.status !== "published") return false;
        if (pub === "no" && row.status === "published") return false;
        if (estado && row.status !== estado) return false;
        if (score && (Number(row.score) || 0) < score) return false;
        const day = (row.created_at || "").slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (search) {
          const haystack =
            `${row.author_name} ${row.author_role || ""} ${row.post_summary || ""} ${
              row.post_text || ""
            }`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      }),
    [sourceRows, pub, estado, score, from, to, search]
  );

  const activeFilters = [
    q,
    pub !== "todos",
    estado,
    score > 0,
    from,
    to,
  ].filter(Boolean).length;

  const effectiveOpen = openId === undefined ? (visibleRows[0]?.id ?? null) : openId;

  const patchRow = async (id: string, body: Record<string, unknown>, message: string) => {
    if (id.startsWith("demo-")) {
      setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...body } as Partial<Row> }));
      notify(message);
      return;
    }
    try {
      const res = await fetch(`/api/linkedin/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      notify(message);
      await load();
    } catch {
      notify("No se pudo guardar el cambio");
    }
  };

  const saveComment = (id: string, value: string) => {
    patchRow(id, { comment_draft: value }, "Comentario guardado");
  };

  return (
    <div className="stack">
      <StripCard
        className="queue"
        title="Cola de aprobación"
        kpis={[{ value: counts.queue, label: "candidatos pendientes" }]}
        actionLabel="Ver detalle"
        open={queueOpen}
        onToggle={() => setQueueOpen((v) => !v)}
        bodyId="queue-body"
      >
        {queue.length ? (
          queue.map((item) => (
            <div className="qitem" key={item.id}>
              <div className="person">
                <div className={item.is_company ? "av co" : "av"}>
                  {initials(item.author_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-strong">{item.author_name}</div>
                  <div className="cell-sub">{item.author_role}</div>
                </div>
              </div>
              <div className="clamp">{item.post_summary}</div>
              <div className="score">
                <b>{item.score ?? 0}</b>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => patchRow(item.id, { status: "draft_ready" }, "Aprobado, ya está en la lista")}
                >
                  <Check size={16} />
                  Aprobar
                </button>
                <button
                  type="button"
                  className="btn bad"
                  onClick={() => patchRow(item.id, { status: "discarded" }, "Candidato rechazado")}
                >
                  <X size={16} />
                  Rechazar
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>
            No hay candidatos pendientes. El próximo lote llega con el cron diario.
          </p>
        )}
      </StripCard>

      <StripCard
        title="Resumen de LinkedIn"
        kpis={[
          { value: counts.posts, label: "posts" },
          { value: counts.draft_ready, label: "con borrador listo" },
          { value: counts.published, label: "publicados" },
          { value: counts.avg_score, label: "score medio" },
        ]}
        actionLabel="Buscar y filtrar"
        activeCount={activeFilters}
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        bodyId="li-body"
      >
        <div className="filters">
          <SearchField
            id="l-q"
            label="Buscar"
            value={q}
            placeholder="Autor, empresa o contenido del post"
            onChange={setQ}
          />
          <SegControl
            label="Publicado"
            labelId="lbl-pub"
            value={pub}
            onChange={setPub}
            options={[
              { value: "todos", label: "Todos", count: counts.posts },
              { value: "si", label: "Sí", count: counts.published },
              { value: "no", label: "No", count: counts.posts - counts.published },
            ]}
          />
          <SelectField
            id="l-estado"
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={STATUS_OPTIONS}
          />
          <SelectField
            id="l-score"
            label="Score"
            value={String(score)}
            onChange={(value) => setScore(Number(value))}
            options={[
              { value: "0", label: "Todos" },
              { value: "85", label: "85 o más" },
              { value: "70", label: "70 o más" },
            ]}
          />
          <div className="field">
            <label htmlFor="l-from">Desde</label>
            <input
              id="l-from"
              className="input"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="l-to">Hasta</label>
            <input
              id="l-to"
              className="input"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </StripCard>

      <div className="card">
        <div className="resultline">
          {failed ? (
            <span style={{ color: "var(--danger)" }}>
              No se pudieron cargar los posts de LinkedIn.
            </span>
          ) : demo ? (
            <>
              Mostrando <b>{visibleRows.length}</b> filas de ejemplo. La tabla real
              está vacía.
            </>
          ) : (
            <>
              <b>{visibleRows.length}</b> de {counts.posts} posts
            </>
          )}
        </div>
        <div className="table">
          <div className="thead cols-li">
            <span>Autor / Empresa</span>
            <span>Post</span>
            <span>Score</span>
            <span>Estado</span>
            <span className="hide-md">Fecha</span>
            <span />
          </div>
          {visibleRows.map((row) => {
            const open = effectiveOpen === row.id;
            const role = (row.author_role || "").replace(", ", " · ");
            const pill = LINKEDIN_STATUS_PILL[row.status];
            const label = LINKEDIN_STATUS_LABEL[row.status];
            const comment = drafts[row.id] ?? row.comment_draft ?? "";
            const scoreValue = Number(row.score) || 0;
            return (
              <div className={open ? "row li open" : "row li"} key={row.id}>
                <div
                  className="row-main cols-li"
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a,button,textarea")) return;
                    setOpenId(open ? null : row.id);
                  }}
                >
                  <div className="person keep-sm">
                    <div className={row.is_company ? "av co" : "av"}>
                      {initials(row.author_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-strong">{row.author_name}</div>
                      <div className="cell-sub">{role}</div>
                      {row.demo ? (
                        <span className="pill pill--demo">Datos de ejemplo</span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="keep-sm clamp"
                    style={{ color: "var(--ink-2)", lineHeight: 1.45 }}
                  >
                    {row.post_summary}
                  </div>
                  <div className="score hide-sm">
                    <b>{scoreValue}</b>
                    <div className="meter">
                      <i
                        style={{
                          width: `${scoreValue}%`,
                          background: scoreColor(scoreValue),
                        }}
                      />
                    </div>
                  </div>
                  <div className="keep-sm">
                    <span className={`pill pill--${pill}`}>
                      <i />
                      {label}
                    </span>
                  </div>
                  <div
                    className="hide-sm hide-md"
                    style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}
                  >
                    {shortDate(row.created_at)}
                  </div>
                  <div className="chev-cell">
                    <button
                      type="button"
                      className="chev plain"
                      aria-expanded={open}
                      aria-label={`Ver post de ${row.author_name}`}
                      onClick={() => setOpenId(open ? null : row.id)}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                {open ? (
                  <div className="li-detail">
                    <div className="li-col">
                      <h4 className="eyebrow">Post completo</h4>
                      <p className="li-post">{row.post_text}</p>
                      <div className="li-meta">
                        {row.post_url ? (
                          <a href={row.post_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={16} />
                            Ver en LinkedIn
                          </a>
                        ) : null}
                        <span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" />
                            <circle cx="6" cy="18" r="1" />
                          </svg>
                          {sourceLabel(row)}
                        </span>
                        <span>Score {scoreValue}</span>
                      </div>
                    </div>
                    <div className="li-col">
                      <label className="eyebrow" htmlFor={`cm-${row.id}`}>
                        Nuestro borrador de comentario
                      </label>
                      <textarea
                        id={`cm-${row.id}`}
                        value={comment}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                        onBlur={() => saveComment(row.id, comment)}
                      />
                      <p className="li-meta">
                        <span>{comment.length}</span> caracteres. Se guarda al salir
                        del campo.
                      </p>
                    </div>
                    <div className="li-col act">
                      <h4 className="eyebrow">Acciones</h4>
                      <div className="li-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={async () => {
                            const ok = await copyText(comment);
                            notify(ok ? "Comentario copiado" : "No se pudo copiar");
                          }}
                        >
                          <Copy size={16} />
                          Copiar comentario
                        </button>
                        {row.post_url ? (
                          <a
                            className="btn"
                            href={row.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={16} />
                            Abrir post
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn primary"
                          disabled={row.status === "published"}
                          onClick={() =>
                            patchRow(row.id, { status: "published" }, "Marcado como publicado")
                          }
                        >
                          <Check size={16} />
                          {row.status === "published" ? "Publicado" : "Marcar publicado"}
                        </button>
                        <button
                          type="button"
                          className="btn bad"
                          disabled={row.status === "discarded"}
                          onClick={() =>
                            patchRow(row.id, { status: "discarded" }, "Post descartado")
                          }
                        >
                          <X size={16} />
                          Descartar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {visibleRows.length === 0 ? (
            <div className="empty">
              <b>No hay posts con estos filtros</b>
              <span>
                Cambia el score o las fechas, o aprueba candidatos de la cola.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  STAGES,
  hasValue,
  initials,
  isSent,
  shortDate,
  stageLabel,
  stageOf,
  type Contact,
  type StageId,
} from "@/lib/jobi";
import { ContactDetail } from "./ContactDetail";
import { SearchField, SegControl, SelectField, StripCard } from "./fields";
import { LinkedInGlyph } from "./icons";

type Contactado = "todos" | "si" | "no";

const EMPTY_STAGES: Record<StageId, number> = {
  nuevo: 0,
  contacto: 0,
  draft: 0,
  enviado: 0,
  respondio: 0,
  descartado: 0,
};

export function ContactsTab({
  contacts,
  loading,
  error,
  onStatusChange,
}: {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, estado: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState("");
  const [contactado, setContactado] = useState<Contactado>("todos");
  const [estado, setEstado] = useState("");
  const [email, setEmail] = useState("");
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);

  const search = useDeferredValue(q).trim().toLowerCase();

  const stageCounts = useMemo(() => {
    const counts = { ...EMPTY_STAGES };
    for (const c of contacts) counts[stageOf(c.estado)] += 1;
    return counts;
  }, [contacts]);

  const sentCount = useMemo(
    () => contacts.filter((c) => isSent(c)).length,
    [contacts]
  );

  const rows = useMemo(() => {
    const list = contacts.filter((c) => {
      const stage = stageOf(c.estado);
      if (estado) {
        if (stage !== estado) return false;
      } else if (stage === "descartado") {
        return false;
      }
      if (contactado === "si" && !isSent(c)) return false;
      if (contactado === "no" && isSent(c)) return false;
      if (email === "con" && !hasValue(c.contacto_email)) return false;
      if (email === "sin" && hasValue(c.contacto_email)) return false;
      if (search) {
        const haystack =
          `${c.empresa} ${c.cargo} ${c.contacto_nombre} ${c.contacto_email}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    return list;
  }, [contacts, estado, contactado, email, search]);

  const activeFilters = [q, contactado !== "todos", estado, email].filter(
    Boolean
  ).length;

  const effectiveOpen = openId === undefined ? (rows[0]?.id ?? null) : openId;

  const resetFilters = () => {
    setQ("");
    setContactado("todos");
    setEstado("");
    setEmail("");
  };

  return (
    <div className="stack">
      <StripCard
        title="Pipeline"
        kpis={[
          { value: contacts.length, label: "contactos" },
          { value: stageCounts.draft, label: "con borrador listo" },
          { value: sentCount, label: "contactados" },
          { value: stageCounts.respondio, label: "respuestas" },
        ]}
        actionLabel="Buscar y filtrar"
        activeCount={activeFilters}
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        bodyId="pipe-body"
      >
        <div className="segbar" aria-label="Contactos por etapa">
          {STAGES.map((stage) => {
            const count = stageCounts[stage.id];
            return (
              <button
                key={stage.id}
                type="button"
                aria-pressed={estado === stage.id}
                title={`${stage.label}: ${count}`}
                style={{
                  flexGrow: Math.max(count, 0.4),
                  background: `var(--s-${stage.id}-bg)`,
                  color: `var(--s-${stage.id}-fg)`,
                }}
                onClick={() => setEstado(estado === stage.id ? "" : stage.id)}
              >
                {stage.label} {count}
              </button>
            );
          })}
        </div>
        <p className="hint">Toca una etapa para filtrar la tabla por ella.</p>
        <div className="filters">
          <SearchField
            id="c-q"
            label="Buscar"
            value={q}
            placeholder="Empresa, puesto, contacto o email"
            onChange={setQ}
          />
          <SegControl
            label="Contactado"
            labelId="lbl-contactado"
            value={contactado}
            onChange={(value) => setContactado(value as Contactado)}
            options={[
              { value: "todos", label: "Todos", count: contacts.length },
              { value: "si", label: "Sí", count: sentCount },
              { value: "no", label: "No", count: contacts.length - sentCount },
            ]}
          />
          <SelectField
            id="c-estado"
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={[
              { value: "", label: "Todos los estados" },
              ...STAGES.map((stage) => ({ value: stage.id, label: stage.label })),
            ]}
          />
          <SelectField
            id="c-email"
            label="Email"
            value={email}
            onChange={setEmail}
            options={[
              { value: "", label: "Todos" },
              { value: "con", label: "Con email" },
              { value: "sin", label: "Sin email" },
            ]}
          />
        </div>
      </StripCard>

      <div className="card">
        <div className="resultline">
          {loading ? (
            "Cargando contactos..."
          ) : error ? (
            <span style={{ color: "var(--danger)" }}>{error}</span>
          ) : (
            <>
              <b>{rows.length}</b> de {contacts.length} contactos
            </>
          )}
        </div>
        <div className="table">
          <div className="thead cols-contacts">
            <span>Empresa</span>
            <span>Puesto</span>
            <span>Contacto</span>
            <span>Estado</span>
            <span className="hide-md">Fecha</span>
            <span />
          </div>
          {rows.map((contact) => {
            const open = effectiveOpen === contact.id;
            const stage = stageOf(contact.estado);
            const hasEmail = hasValue(contact.contacto_email);
            const hasLinkedin = hasValue(contact.contacto_linkedin);
            const primary =
              contact.contacto_nombre || contact.contacto_email || "Sin contacto";
            return (
              <div className={open ? "row open" : "row"} key={contact.id}>
                <div
                  className="row-main cols-contacts"
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a,button")) return;
                    setOpenId(open ? null : contact.id);
                  }}
                >
                  <div className="keep-sm" style={{ minWidth: 0 }}>
                    <div className="cell-strong">{contact.empresa}</div>
                  </div>
                  <div className="keep-sm" style={{ minWidth: 0 }}>
                    <div
                      className="clamp"
                      style={{ fontWeight: 500, lineHeight: 1.35 }}
                    >
                      {contact.cargo}
                    </div>
                  </div>
                  <div className="person keep-sm">
                    <div className="av">{initials(primary)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-strong">{primary}</div>
                      {contact.contacto_nombre ? (
                        hasEmail ? (
                          <div className="cell-sub">{contact.contacto_email}</div>
                        ) : (
                          <div className="noemail">Sin email</div>
                        )
                      ) : hasEmail ? null : (
                        <div className="noemail">Sin email</div>
                      )}
                    </div>
                    {hasLinkedin ? (
                      <a
                        className="inbtn"
                        href={contact.contacto_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`LinkedIn de ${primary}`}
                      >
                        <LinkedInGlyph />
                      </a>
                    ) : null}
                  </div>
                  <div className="keep-sm">
                    <span
                      className="badge"
                      style={{
                        background: `var(--s-${stage}-bg)`,
                        color: `var(--s-${stage}-fg)`,
                      }}
                    >
                      <i style={{ background: `var(--s-${stage}-dot)` }} />
                      {stageLabel(stage)}
                    </span>
                  </div>
                  <div
                    className="hide-sm hide-md"
                    style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}
                  >
                    {shortDate(contact.created_at)}
                  </div>
                  <div className="chev-cell">
                    <button
                      type="button"
                      className="chev plain"
                      aria-expanded={open}
                      aria-label={`Ver detalle de ${contact.empresa}`}
                      onClick={() => setOpenId(open ? null : contact.id)}
                    >
                      <ChevronRight size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
                {open ? (
                  <ContactDetail
                    contact={contact}
                    onStatusChange={onStatusChange}
                  />
                ) : null}
              </div>
            );
          })}
          {!loading && !error && rows.length === 0 ? (
            <div className="empty">
              <b>Ningún contacto con estos filtros</b>
              <span>Quita un filtro o borra la búsqueda.</span>
              <button className="btn primary" type="button" onClick={resetFilters}>
                Borrar filtros
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

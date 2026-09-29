"use client";

import { Copy } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { initials, shortDate, type Person } from "@/lib/jobi";
import { copyText, useToast } from "./Toast";
import { SearchField, SegControl, SelectField, StripCard } from "./fields";
import { LinkedInGlyph } from "./icons";

export function DirectoryTab({ people }: { people: Person[] }) {
  const notify = useToast();
  const [q, setQ] = useState("");
  const [data, setData] = useState("todos");
  const [source, setSource] = useState("");
  const search = useDeferredValue(q).trim().toLowerCase();

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const person of people) set.add(person.source);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [people]);

  const visible = useMemo(
    () =>
      people.filter((person) => {
        if (data === "email" && !person.email) return false;
        if (data === "li" && !person.linkedin) return false;
        if (source && person.source !== source) return false;
        if (search) {
          const haystack =
            `${person.name} ${person.company} ${person.role} ${person.email}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      }),
    [people, data, source, search]
  );

  const copyEmails = async () => {
    const emails = visible.map((person) => person.email).filter(Boolean);
    if (!emails.length) {
      notify("No hay emails en esta vista");
      return;
    }
    const ok = await copyText(emails.join("\n"));
    notify(ok ? `${emails.length} emails copiados` : "No se pudo copiar");
  };

  const copyEmail = async (email: string) => {
    const ok = await copyText(email);
    notify(ok ? "Email copiado" : "No se pudo copiar");
  };

  return (
    <div className="stack">
      <StripCard
        title="Directorio"
        kpis={[
          { value: people.length, label: "personas" },
          { value: people.filter((p) => p.email).length, label: "con email" },
          { value: people.filter((p) => p.linkedin).length, label: "con LinkedIn" },
        ]}
      >
        <div className="filters">
          <SearchField
            id="d-q"
            label="Buscar"
            value={q}
            placeholder="Nombre, empresa, rol o email"
            onChange={setQ}
          />
          <SegControl
            label="Datos"
            labelId="lbl-dat"
            value={data}
            onChange={setData}
            options={[
              { value: "todos", label: "Todos", count: people.length },
              {
                value: "email",
                label: "Con email",
                count: people.filter((p) => p.email).length,
              },
              {
                value: "li",
                label: "Con LinkedIn",
                count: people.filter((p) => p.linkedin).length,
              },
            ]}
          />
          <SelectField
            id="d-src"
            label="Fuente"
            value={source}
            onChange={setSource}
            options={[
              { value: "", label: "Todas" },
              ...sources.map((item) => ({ value: item, label: item })),
            ]}
          />
          <div className="field">
            <button
              className="btn primary"
              id="d-copy"
              type="button"
              style={{ height: 48 }}
              onClick={copyEmails}
            >
              <Copy size={16} />
              Copiar emails visibles
            </button>
          </div>
        </div>
        <div className="resultline" style={{ borderTop: "1px solid var(--line)" }}>
          <b>{visible.length}</b> de {people.length} personas encontradas
        </div>
        <div className="table">
          <div className="thead cols-dir">
            <span>Nombre</span>
            <span>Empresa</span>
            <span>Rol</span>
            <span>Email</span>
            <span>LinkedIn</span>
            <span>Encontrado</span>
          </div>
          {visible.map((person) => (
            <div className="row" key={person.key}>
              <div className="row-main cols-dir dir" style={{ cursor: "default" }}>
                <div className="person">
                  <div className="av">{initials(person.name)}</div>
                  <div className="cell-strong">{person.name}</div>
                </div>
                <div className="cell-strong" style={{ fontWeight: 600 }}>
                  {person.company}
                </div>
                <div
                  className="cell-sub"
                  style={{ color: "var(--ink-2)", fontSize: 14 }}
                >
                  {person.role}
                </div>
                <div style={{ minWidth: 0 }}>
                  {person.email ? (
                    <button
                      type="button"
                      className="linkbtn dir-mail"
                      aria-label={`Copiar ${person.email}`}
                      onClick={() => copyEmail(person.email)}
                    >
                      <Copy size={16} />
                      <span className="cell-sub">{person.email}</span>
                    </button>
                  ) : (
                    <span className="noemail">Sin email</span>
                  )}
                </div>
                <div>
                  {person.linkedin ? (
                    <a
                      className="btn dir-profile"
                      href={person.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkedInGlyph size={16} />
                      Perfil
                    </a>
                  ) : (
                    <span className="cell-sub">Sin perfil</span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
                  {shortDate(person.found)}
                  <div className="cell-sub">{person.source}</div>
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 ? (
            <div className="empty">
              <b>Nadie coincide con la búsqueda</b>
              <span>Prueba con otro nombre o quita el filtro de datos.</span>
            </div>
          ) : null}
        </div>
      </StripCard>
    </div>
  );
}

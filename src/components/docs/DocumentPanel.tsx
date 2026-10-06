"use client";

// Panel de documentos dentro de la ficha de la oferta:
//   1. texto de la vacante (se guarda con PATCH al salir del campo)
//   2. selector de idioma (Auto / DE / EN) + los tres documentos opcionales
//   3. vista previa modal con edición WYSIWYG, guardado y Descargar PDF
//
// El idioma elegido viaja en el campo `language` del body del
// POST /api/documents y de los PATCH (vacante y guardado de ediciones). Con
// «Auto» el campo no se manda y decide el servidor con su detección.
//
// Sin dependencias de PDF: «Descargar PDF» inyecta la regla @page que
// corresponde al tipo de documento y dispara window.print().

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileText,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import type { DocType } from "@/lib/documents";
import { fmtDate, type Contact } from "@/lib/jobi";
import { SegControl } from "../jobi/fields";
import { useToast } from "../jobi/Toast";
import type { EditablePath } from "./Editable";
import {
  AnschreibenSheet,
  CvSheet,
  MhDeck,
  type AnschreibenData,
  type CvData,
  type MhData,
  type SheetEdit,
} from "./templates";
import styles from "./docs.module.css";

/* ------------------------------------------------------------------ *
 * Constantes locales: no importamos valores de @/lib/documents para
 * que el bundle del cliente no se lleve los JSON maestros.
 * ------------------------------------------------------------------ */
const OPTIONS: { tipo: DocType; label: string }[] = [
  { tipo: "cv", label: "CV" },
  { tipo: "cv_anschreiben", label: "CV + Anschreiben" },
  { tipo: "mh", label: "make happen" },
];

const PAGE_STYLE_ID = "jobi-doc-page-style";

type DocMap = Partial<Record<DocType, DocRecord | null>>;
type LangPref = "auto" | "de" | "en";

interface DocRecord {
  language?: string;
  generated_at?: string;
  model?: string;
  edited_by?: string;
  data?: Record<string, unknown>;
}

/** Estado local (docs + vacante) anclado a la clave de la fila abierta. */
interface LocalState {
  stamp: string;
  docs: DocMap;
  vacante: string;
}

function labelOf(tipo: DocType): string {
  return OPTIONS.find((o) => o.tipo === tipo)?.label ?? tipo;
}

function asDoc(value: unknown): DocRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as DocRecord;
  return rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
    ? rec
    : null;
}

function readDocs(contact: Contact): DocMap {
  return {
    cv: asDoc(contact.doc_cv),
    cv_anschreiben: asDoc(contact.doc_anschreiben),
    mh: asDoc(contact.doc_mh),
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Mensajes de error cortos y en una línea: nunca un stack trace. */
function msgOf(value: unknown): string {
  const raw =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : "error desconocido";
  return raw.replace(/\s+/g, " ").slice(0, 150);
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

/** Copia profunda del documento con un nodo sustituido por `value`. */
function setAtPath(
  node: unknown,
  path: readonly EditablePath[number][],
  value: string
): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(node)) {
    const copy = node.slice();
    copy[Number(head)] = setAtPath(copy[Number(head)], rest, value);
    return copy;
  }
  if (node && typeof node === "object") {
    const copy = { ...(node as Record<string, unknown>) };
    copy[String(head)] = setAtPath(copy[String(head)], rest, value);
    return copy;
  }
  return value;
}

function renderDoc(
  tipo: DocType,
  data: Record<string, unknown>,
  edit?: SheetEdit
) {
  if (tipo === "cv") {
    return <CvSheet data={data as unknown as CvData} edit={edit} />;
  }
  if (tipo === "cv_anschreiben") {
    return <AnschreibenSheet data={data as unknown as AnschreibenData} edit={edit} />;
  }
  return <MhDeck data={data as unknown as MhData} edit={edit} />;
}

/* Sustituye al clásico setMounted(true) dentro de un efecto. */
const subscribeNothing = () => () => {};
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

/* ------------------------------------------------------------------ */

export function DocumentPanel({ contact }: { contact: Contact }) {
  const notify = useToast();
  const isClient = useIsClient();

  // Clave de la fila: si cambia la ficha (u otra versión de la fila tras un
  // refetch) los estados locales derivados vuelven a su valor inicial.
  const stamp = `${contact.id}|${contact.updated_at}`;

  const [local, setLocal] = useState<LocalState>(() => ({
    stamp,
    docs: {},
    vacante: contact.vacante_texto ?? "",
  }));
  const [savedVacante, setSavedVacante] = useState<{
    stamp: string;
    value: string;
  } | null>(null);
  const [previewState, setPreviewState] = useState<{
    stamp: string;
    tipo: DocType;
    doc: DocRecord;
  } | null>(null);
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [instruccion, setInstruccion] = useState("");
  const [busy, setBusy] = useState<DocType | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  /** Aplica un cambio al estado local, reiniciándolo si cambió la fila. */
  const patchLocal = useCallback(
    (fn: (value: LocalState) => LocalState) => {
      setLocal((prev) =>
        fn(
          prev.stamp === stamp
            ? prev
            : { stamp, docs: {}, vacante: contact.vacante_texto ?? "" }
        )
      );
    },
    [stamp, contact.vacante_texto]
  );

  const live = local.stamp === stamp;
  const docs: DocMap = live
    ? { ...readDocs(contact), ...local.docs }
    : readDocs(contact);
  const vacante = live ? local.vacante : (contact.vacante_texto ?? "");
  const savedValue =
    savedVacante?.stamp === stamp
      ? savedVacante.value
      : (contact.vacante_texto ?? "");
  const preview =
    previewState && previewState.stamp === stamp ? previewState : null;

  // Idioma: «Auto» no manda nada y lo decide el servidor.
  const forced: LangPref | null = langPref === "auto" ? null : langPref;
  const langField = forced ? { language: forced } : {};

  // Cronómetro del estado de carga (la generación tarda 20-60 s).
  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const data: Record<string, unknown> = preview
    ? editing && draft
      ? draft
      : ((preview.doc.data ?? {}) as Record<string, unknown>)
    : {};
  const docLang = str(
    editing && draft ? draft.language : preview?.doc.language
  ).toUpperCase();

  /** Idioma efectivo de la vista previa + cómo se decidió. */
  const effectiveLanguage = !docLang
    ? ""
    : !forced
      ? `Idioma: ${docLang} · automático (servidor)`
      : forced.toUpperCase() === docLang
        ? `Idioma: ${docLang} · elegido`
        : `Idioma: ${docLang} · elegido: ${forced.toUpperCase()}`;

  const edit: SheetEdit | undefined = editing
    ? {
        onChange: (next, path) => {
          setDraft((prev) =>
            prev
              ? (setAtPath(prev, path, next) as Record<string, unknown>)
              : prev
          );
        },
      }
    : undefined;

  const openPreview = (tipo: DocType, doc: DocRecord) => {
    setPreviewState({ stamp, tipo, doc });
    setEditing(false);
    setDraft(null);
  };

  /* ---------------- llamadas a la API ---------------- */

  const generate = async (tipo: DocType, extra?: string) => {
    if (busy) return;
    setElapsed(0);
    setBusy(tipo);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          tipo,
          vacante_texto: vacante.trim() || undefined,
          instruccion: extra?.trim() || undefined,
          ...langField,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        doc?: unknown;
        error?: unknown;
      };
      if (!res.ok) {
        notify(`No se pudo generar «${labelOf(tipo)}»: ${msgOf(json.error)}`);
        return;
      }
      const doc = asDoc(json.doc);
      if (!doc) {
        notify(`«${labelOf(tipo)}» se generó pero la respuesta no era válida`);
        return;
      }
      patchLocal((value) => ({
        ...value,
        docs: { ...value.docs, [tipo]: doc },
      }));
      openPreview(tipo, doc);
      notify(`«${labelOf(tipo)}» generado`);
    } catch (err) {
      notify(`No se pudo generar «${labelOf(tipo)}»: ${msgOf(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const saveVacante = async () => {
    const texto = vacante.trim();
    if (texto === savedValue.trim()) return;
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          vacante_texto: texto,
          ...langField,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedVacante({ stamp, value: texto });
      notify("Texto de la vacante guardado");
    } catch (err) {
      notify(`No se pudo guardar el texto de la vacante: ${msgOf(err)}`);
    }
  };

  const startEdit = () => {
    if (!preview?.doc.data) return;
    setDraft(cloneData(preview.doc.data));
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!preview || !draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          tipo: preview.tipo,
          data: draft,
          ...langField,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) throw new Error(msgOf(json.error));
      const doc: DocRecord = {
        ...preview.doc,
        ...(draft as DocRecord),
        language: str(draft.language) || preview.doc.language || "de",
        generated_at: preview.doc.generated_at,
        edited_by: "manual",
        data: draft,
      };
      patchLocal((value) => ({
        ...value,
        docs: { ...value.docs, [preview.tipo]: doc },
      }));
      setPreviewState({ stamp, tipo: preview.tipo, doc });
      setEditing(false);
      setDraft(null);
      notify("Cambios guardados");
    } catch (err) {
      notify(`No se pudieron guardar los cambios: ${msgOf(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const closePreview = useCallback(() => {
    if (editing) {
      notify("Vista previa cerrada; los cambios sin guardar se descartaron");
    }
    setPreviewState(null);
    setEditing(false);
    setDraft(null);
  }, [editing, notify]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, closePreview]);

  /** Descargar PDF: inyecta @page según el tipo y usa el diálogo de imprimir. */
  const downloadPdf = () => {
    if (!preview) return;
    let style = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = PAGE_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent =
      preview.tipo === "mh"
        ? "@page { size: 12in 6.75in; margin: 0; }"
        : "@page { size: A4; margin: 0; }";
    window.print();
  };

  /* ---------------- render ---------------- */

  const chips = OPTIONS.filter((option) => docs[option.tipo]);
  const meta = preview
    ? [
        effectiveLanguage,
        preview.doc.model ? `Modelo: ${preview.doc.model}` : null,
        preview.doc.generated_at
          ? `Generado: ${fmtDate(preview.doc.generated_at, true)}`
          : null,
        preview.doc.edited_by === "manual" ? "Editado a mano" : null,
      ].filter(Boolean)
    : [];

  return (
    <div className={styles.docs}>
      {/* Texto de la vacante */}
      <div className="draft">
        <label className="eyebrow" htmlFor={`vacante-${contact.id}`}>
          Texto de la vacante
          <span className="tag">{vacante.length} caracteres</span>
        </label>
        <textarea
          id={`vacante-${contact.id}`}
          className={styles.vacante}
          value={vacante}
          onChange={(event) =>
            patchLocal((value) => ({ ...value, vacante: event.target.value }))
          }
          onBlur={saveVacante}
          placeholder="Pega aquí el texto completo de la oferta. Se guarda al salir del campo y se usa como contexto para generar los documentos."
        />
      </div>

      {/* Idioma + los tres documentos opcionales */}
      <div className={styles.docRow}>
        <SegControl
          label="Idioma del documento"
          labelId={`doc-lang-${contact.id}`}
          value={langPref}
          onChange={(value) => setLangPref(value as LangPref)}
          options={[
            { value: "auto", label: "Auto" },
            { value: "de", label: "DE" },
            { value: "en", label: "EN" },
          ]}
        />
        {OPTIONS.map((option) => (
          <button
            key={option.tipo}
            className="btn"
            type="button"
            disabled={busy !== null}
            onClick={() => generate(option.tipo, instruccion)}
          >
            {busy === option.tipo ? (
              <LoaderCircle size={16} className={styles.spin} />
            ) : (
              <FileText size={16} />
            )}
            {busy === option.tipo ? "Generando…" : option.label}
          </button>
        ))}
      </div>

      <p className={styles.hint}>
        {forced
          ? `Idioma forzado: ${forced.toUpperCase()} — se envía en el campo «language» del body del POST/PATCH.`
          : "Idioma automático: lo detecta el servidor según el texto de la vacante."}
      </p>

      {busy ? (
        <p className={styles.loading}>
          <LoaderCircle size={16} className={styles.spin} />
          Generando «{labelOf(busy)}»… entre 20 y 60 s ({elapsed} s)
        </p>
      ) : null}

      {/* Regenerar con instrucción opcional */}
      <div className="draft">
        <label className="eyebrow" htmlFor={`instruccion-${contact.id}`}>
          Instrucción para regenerar
          <span className="tag">opcional</span>
        </label>
        <input
          id={`instruccion-${contact.id}`}
          className="input"
          value={instruccion}
          onChange={(event) => setInstruccion(event.target.value)}
          placeholder="p. ej. más corto, tono más formal, más peso en IA…"
        />
        <button
          className="minibtn"
          type="button"
          disabled={!preview || busy !== null}
          onClick={() => preview && generate(preview.tipo, instruccion)}
        >
          <RefreshCw size={16} />
          Regenerar {preview ? labelOf(preview.tipo) : ""}
        </button>
      </div>

      {/* Documentos ya generados */}
      {chips.length > 0 ? (
        <div className={styles.chips}>
          {chips.map((option) => {
            const doc = docs[option.tipo];
            return (
              <button
                key={option.tipo}
                className={styles.chip}
                type="button"
                disabled={busy !== null}
                onClick={() => doc && openPreview(option.tipo, doc)}
              >
                <FileText size={14} />
                {option.label}
                <span className="tag">
                  {str(doc?.language).toUpperCase() || "—"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.hint}>
          Todavía no hay ningún documento generado para esta oferta.
        </p>
      )}

      {meta.length > 0 ? (
        <div className={styles.dMeta}>
          {meta.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}

      {/* Vista previa */}
      {isClient && preview
        ? createPortal(
            <div
              className={`doc-modal-root ${styles.scrim}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closePreview();
              }}
            >
              <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label={`Vista previa de ${labelOf(preview.tipo)}`}
              >
                <div className={styles.mHead}>
                  <span className="eyebrow">
                    {labelOf(preview.tipo)}
                    <span className="tag">{docLang || "—"}</span>
                    <span className="tag">
                      {forced ? `forzado ${forced.toUpperCase()}` : "auto"}
                    </span>
                    {editing ? <span className="tag">editando</span> : null}
                  </span>
                  <div className={styles.mActions}>
                    {editing ? (
                      <button
                        className="minibtn"
                        type="button"
                        disabled={saving}
                        onClick={saveEdits}
                      >
                        <Save size={16} />
                        {saving ? "Guardando…" : "Guardar cambios"}
                      </button>
                    ) : (
                      <button
                        className="minibtn"
                        type="button"
                        onClick={startEdit}
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}
                    <button className="minibtn" type="button" onClick={downloadPdf}>
                      <Download size={16} />
                      Descargar PDF
                    </button>
                    <button className="minibtn" type="button" onClick={closePreview}>
                      <X size={16} />
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className={styles.mBody}>
                  {renderDoc(preview.tipo, data, edit)}
                </div>

                <div className={styles.mFoot}>
                  <span>{meta.join(" · ")}</span>
                  <span>
                    {editing
                      ? "Modo edición: pulsa un texto para cambiarlo y «Guardar cambios» para persistirlo."
                      : "Vista previa de solo lectura."}
                  </span>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Copia que es la única visible al imprimir */}
      {isClient && preview
        ? createPortal(
            <div
              className={`doc-print-root ${styles.docPrint}`}
              aria-hidden="true"
            >
              {renderDoc(preview.tipo, data, undefined)}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default DocumentPanel;

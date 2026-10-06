"use client";

import { Briefcase, Check, Copy, ExternalLink, RefreshCw, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildMailto,
  draftText,
  fmtDate,
  hasValue,
  splitSubject,
  stageOf,
  type Contact,
} from "@/lib/jobi";
import { detectLanguage } from "@/lib/documents";
import { LinkedInGlyph } from "./icons";
import { copyText, useToast } from "./Toast";
import { SegControl } from "./fields";

type DmMode = "candidate" | "partner";
type Lang = "de" | "en";
type Target = "mh" | "fl" | "intro";

/** Compact DE | EN switch shown next to each regenerate button. */
function LangToggle({
  value,
  onChange,
  label,
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  label: string;
}) {
  return (
    <div className="langtoggle" role="group" aria-label={label}>
      {(["de", "en"] as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={value === lang}
          onClick={() => onChange(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function DraftBlock({
  title,
  tag,
  subject,
  body,
  onCopy,
  onRegenerate,
  busy,
  regenLabel,
  lang,
  onLang,
}: {
  title: string;
  tag: string;
  subject: string;
  body: string;
  onCopy: () => void;
  onRegenerate?: () => void;
  busy?: boolean;
  regenLabel?: string;
  lang?: Lang;
  onLang?: (lang: Lang) => void;
}) {
  return (
    <div className="draft">
      <h4 className="eyebrow">
        {title}
        <span className="tag">{tag}</span>
      </h4>
      <div className="subj">
        <span>Betreff: </span>
        <b>{subject}</b>
      </div>
      <pre>{body}</pre>
      <div className="draft-actions">
        <button className="minibtn" type="button" onClick={onCopy}>
          <Copy size={16} />
          Copiar
        </button>
        {onRegenerate ? (
          <button
            className="minibtn"
            type="button"
            onClick={onRegenerate}
            disabled={busy}
            title="Regenera solo este texto con la IA"
          >
            <RefreshCw size={16} className={busy ? "spin" : undefined} />
            {busy ? "Generando…" : regenLabel || "Regenerar"}
          </button>
        ) : null}
        {onRegenerate && lang && onLang ? (
          <LangToggle
            value={lang}
            onChange={onLang}
            label={`Idioma de ${regenLabel || "este texto"}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value?: string | null }) {
  const text = fmtDate(value, true);
  return (
    <div>
      <span>{label}</span>
      {text ? <b>{text}</b> : <b className="pending">Pendiente</b>}
    </div>
  );
}

export function ContactDetail({
  contact,
  onStatusChange,
}: {
  contact: Contact;
  onStatusChange: (id: string, estado: string) => void;
}) {
  const notify = useToast();
  const stage = stageOf(contact.estado);
  const [drafts, setDrafts] = useState({
    mh: contact.email_draft || "",
    fl: contact.email_freelancer || "",
    intro: contact.linkedin_intro || "",
  });
  const [regenerating, setRegenerating] = useState<Target | null>(null);
  // Language of each regenerate control: starts as the detected language of the
  // offer and can be flipped to DE/EN right next to its Regenerar button.
  const detectedLang = useMemo(
    () =>
      detectLanguage(
        (contact as unknown as { vacante_texto?: string | null }).vacante_texto,
        contact.hipotesis,
        contact.cargo,
        contact.empresa
      ),
    [contact]
  );
  const [langs, setLangs] = useState<{ mh: Lang; fl: Lang; intro: Lang }>({
    mh: detectedLang,
    fl: detectedLang,
    intro: detectedLang,
  });
  const hasMh = hasValue(drafts.mh);
  const hasFl = hasValue(drafts.fl);
  const hasDrafts = hasMh || hasFl;
  const hasIntro = hasValue(drafts.intro);
  const intro = drafts.intro;
  const mh = splitSubject(drafts.mh, contact);
  const fl = splitSubject(drafts.fl, contact);

  // LinkedIn direct messages (JOBI v2 rows): both variants stay editable.
  const hasLiDm =
    hasValue(contact.draft_dm_candidate) || hasValue(contact.draft_dm_partner);
  const [dmMode, setDmMode] = useState<DmMode>(
    hasValue(contact.draft_dm_candidate) ? "candidate" : "partner"
  );
  const [dmCandidate, setDmCandidate] = useState(contact.draft_dm_candidate || "");
  const [dmPartner, setDmPartner] = useState(contact.draft_dm_partner || "");
  const [dmComment, setDmComment] = useState(contact.draft_comment || "");
  const dmVisible = dmMode === "candidate" ? dmCandidate : dmPartner;

  const copy = async (text: string, message: string) => {
    const ok = await copyText(text);
    notify(ok ? message : "No se pudo copiar");
  };

  /**
   * Regenerates ONE text at a time (each button is independent):
   * "mh" = email make happen, "fl" = email freelance, "intro" = LinkedIn intro
   * (capped at 300 chars). The language comes from that control's DE|EN toggle.
   */
  const regenerate = async (target: Target) => {
    setRegenerating(target);
    try {
      const res = await fetch("/api/contacts/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          target,
          language: langs[target],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        column?: string;
        language?: string;
        cost_usd?: number | null;
      } & Record<string, unknown>;
      const value = json.column ? String(json[json.column] ?? "") : "";
      if (!res.ok || !value) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setDrafts((prev) => ({
        ...prev,
        [target === "mh" ? "mh" : target === "fl" ? "fl" : "intro"]: value,
      }));
      const cost =
        typeof json.cost_usd === "number" ? ` · $${json.cost_usd.toFixed(4)}` : "";
      const tag = target === "mh" ? "Email Make Happen" : target === "fl" ? "Email freelance" : "Intro LinkedIn";
      notify(`${tag} regenerado (${json.language || "?"}${cost})`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo regenerar");
    } finally {
      setRegenerating(null);
    }
  };

  const saveLiDraft = async (
    field: "draft_dm_candidate" | "draft_dm_partner" | "draft_comment",
    value: string
  ) => {
    try {
      const res = await fetch("/api/contacts/update-li", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id, [field]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notify("Borrador guardado");
    } catch {
      notify("No se pudo guardar el borrador");
    }
  };

  return (
    <div className="detail">
      <div className="dcard">
        <div className="dsec">
          <h4>Hipótesis</h4>
          <p className="hyp">{contact.hipotesis || "Sin hipótesis registrada."}</p>
        </div>

        <div className="dsec">
          <h4>
            Borradores de email
            <span className="tag">
              Make Happen · Freelance · intro LinkedIn (máx. 300)
            </span>
          </h4>
          {hasDrafts ? (
            <div className="drafts">
              {hasMh ? (
                <DraftBlock
                  title="Email draft, Make Happen"
                  tag="Empresa"
                  subject={mh.subject}
                  body={mh.body}
                  onCopy={() =>
                    copy(draftText(drafts.mh, contact), "Email Make Happen copiado")
                  }
                  onRegenerate={() => regenerate("mh")}
                  busy={regenerating === "mh"}
                  regenLabel="Regenerar email MH"
                  lang={langs.mh}
                  onLang={(lang) => setLangs((prev) => ({ ...prev, mh: lang }))}
                />
              ) : null}
              {hasFl ? (
                <DraftBlock
                  title="Email draft, Gabriel freelancer"
                  tag="Freelance"
                  subject={fl.subject}
                  body={fl.body}
                  onCopy={() =>
                    copy(
                      draftText(drafts.fl, contact),
                      "Email freelancer copiado"
                    )
                  }
                  onRegenerate={() => regenerate("fl")}
                  busy={regenerating === "fl"}
                  regenLabel="Regenerar email freelance"
                  lang={langs.fl}
                  onLang={(lang) => setLangs((prev) => ({ ...prev, fl: lang }))}
                />
              ) : null}
            </div>
          ) : (
            <>
              <p className="hyp" style={{ color: "var(--muted)" }}>
                {hasValue(contact.contacto_email)
                  ? "Todavía no hay borrador para este contacto."
                  : "Sin email encontrado, así que no hay borrador. Usa la intro de LinkedIn para abrir conversación."}
              </p>
              <div className="draft-actions">
                <button
                  className="minibtn"
                  type="button"
                  onClick={() => regenerate("mh")}
                  disabled={regenerating !== null}
                >
                  <RefreshCw size={16} className={regenerating === "mh" ? "spin" : undefined} />
                  {regenerating === "mh" ? "Generando…" : "Generar email MH"}
                </button>
                <LangToggle
                  value={langs.mh}
                  onChange={(lang) => setLangs((prev) => ({ ...prev, mh: lang }))}
                  label="Idioma del email Make Happen"
                />
                <button
                  className="minibtn"
                  type="button"
                  onClick={() => regenerate("fl")}
                  disabled={regenerating !== null}
                >
                  <RefreshCw size={16} className={regenerating === "fl" ? "spin" : undefined} />
                  {regenerating === "fl" ? "Generando…" : "Generar email freelance"}
                </button>
                <LangToggle
                  value={langs.fl}
                  onChange={(lang) => setLangs((prev) => ({ ...prev, fl: lang }))}
                  label="Idioma del email freelance"
                />
              </div>
            </>
          )}
        </div>

        {hasLiDm ? (
          <div className="dsec" data-testid="li-dm">
            <h4>
              Mensajes de LinkedIn
              <span className="tag">
                {dmMode === "candidate" ? "Candidato" : "Partner"}
              </span>
            </h4>
            <SegControl
              label="Tipo de DM"
              labelId="dm-mode"
              value={dmMode}
              onChange={(value) => setDmMode(value as DmMode)}
              options={[
                { value: "candidate", label: "DM Candidato" },
                { value: "partner", label: "DM Partner" },
              ]}
            />
            <div className="draft">
              <label className="eyebrow" htmlFor={`dm-${contact.id}`}>
                {dmMode === "candidate" ? "DM Candidato" : "DM Partner"}
                <span className="tag">{dmVisible.length} caracteres</span>
              </label>
              <textarea
                id={`dm-${contact.id}`}
                style={{ minHeight: 160 }}
                value={dmVisible}
                onChange={(event) =>
                  dmMode === "candidate"
                    ? setDmCandidate(event.target.value)
                    : setDmPartner(event.target.value)
                }
                onBlur={() =>
                  saveLiDraft(
                    dmMode === "candidate" ? "draft_dm_candidate" : "draft_dm_partner",
                    dmVisible
                  )
                }
              />
              <button
                className="minibtn"
                type="button"
                onClick={() => copy(dmVisible, "DM copiado")}
              >
                <Copy size={16} />
                Copiar DM
              </button>
            </div>
            <div className="draft">
              <label className="eyebrow" htmlFor={`dc-${contact.id}`}>
                Comentario
                <span className="tag">{dmComment.length} caracteres</span>
              </label>
              <textarea
                id={`dc-${contact.id}`}
                style={{ minHeight: 120 }}
                value={dmComment}
                onChange={(event) => setDmComment(event.target.value)}
                onBlur={() => saveLiDraft("draft_comment", dmComment)}
              />
            </div>
            <div className="actions">
              {hasValue(contact.contacto_linkedin) ? (
                <a
                  className="btn"
                  href={contact.contacto_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Abrir perfil
                </a>
              ) : (
                <button className="btn" type="button" disabled>
                  <ExternalLink size={16} />
                  Abrir perfil
                </button>
              )}
              <button
                className="btn good"
                type="button"
                disabled={stage === "enviado"}
                onClick={() => onStatusChange(contact.id, "Enviado")}
              >
                <Send size={16} />
                {stage === "enviado" ? "Enviado" : "Marcar enviado"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="dsec">
          <h4>
            LinkedIn intro
            <span
              className="tag"
              style={intro.length > 300 ? { color: "var(--bad, #b00020)" } : undefined}
            >
              {intro.length} de 300 caracteres
            </span>
          </h4>
          {hasIntro ? (
            <div className="draft">
              <pre>{intro}</pre>
              <div className="draft-actions">
                <button
                  className="minibtn"
                  type="button"
                  onClick={() => copy(intro, "Intro de LinkedIn copiada")}
                >
                  <Copy size={16} />
                  Copiar
                </button>
                <button
                  className="minibtn"
                  type="button"
                  onClick={() => regenerate("intro")}
                  disabled={regenerating !== null}
                  title="Regenera solo la intro de LinkedIn (máximo 300 caracteres)"
                >
                  <RefreshCw
                    size={16}
                    className={regenerating === "intro" ? "spin" : undefined}
                  />
                  {regenerating === "intro" ? "Generando…" : "Regenerar intro"}
                </button>
                <LangToggle
                  value={langs.intro}
                  onChange={(lang) => setLangs((prev) => ({ ...prev, intro: lang }))}
                  label="Idioma de la intro de LinkedIn"
                />
              </div>
            </div>
          ) : (
            <div className="draft-actions">
              <button
                className="minibtn"
                type="button"
                onClick={() => regenerate("intro")}
                disabled={regenerating !== null}
              >
                <RefreshCw
                  size={16}
                  className={regenerating === "intro" ? "spin" : undefined}
                />
                {regenerating === "intro" ? "Generando…" : "Generar intro LinkedIn"}
              </button>
              <LangToggle
                value={langs.intro}
                onChange={(lang) => setLangs((prev) => ({ ...prev, intro: lang }))}
                label="Idioma de la intro de LinkedIn"
              />
            </div>
          )}
        </div>

        <div className="timeline">
          <TimelineItem label="Creado" value={contact.created_at} />
          <TimelineItem label="Enviado" value={contact.fecha_envio} />
          <TimelineItem label="Follow-up 1" value={contact.fecha_followup_1} />
          <TimelineItem label="Follow-up 2" value={contact.fecha_followup_2} />
        </div>

        <div className="actions">
          {hasValue(contact.job_link) ? (
            <a
              className="btn"
              href={contact.job_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Briefcase size={16} />
              Ver oferta
            </a>
          ) : null}
          {hasValue(contact.contacto_email) ? (
            <a className="btn primary" href={buildMailto(contact)}>
              <Send size={16} />
              Enviar email
            </a>
          ) : (
            <button className="btn" type="button" disabled>
              <Send size={16} />
              Enviar email
            </button>
          )}
          {hasValue(contact.contacto_linkedin) ? (
            <a
              className="btn"
              href={contact.contacto_linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkedInGlyph size={16} />
              Mensaje en LinkedIn
            </a>
          ) : null}
        </div>

        <div className="statusbar">
          <span>Actualizar estado</span>
          <button
            className="btn good"
            type="button"
            disabled={stage === "enviado"}
            onClick={() => onStatusChange(contact.id, "Enviado")}
          >
            <Send size={16} />
            {stage === "enviado" ? "Enviado" : "Marcar como enviado"}
          </button>
          <button
            className="btn good"
            type="button"
            disabled={stage === "respondio"}
            onClick={() => onStatusChange(contact.id, "Respondió")}
          >
            <Check size={16} />
            Respondió
          </button>
          <button
            className="btn bad"
            type="button"
            disabled={stage === "descartado"}
            onClick={() => onStatusChange(contact.id, "Descartado")}
          >
            <X size={16} />
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}

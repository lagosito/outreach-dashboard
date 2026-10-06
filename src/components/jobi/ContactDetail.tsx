"use client";

import { Briefcase, Check, Copy, ExternalLink, Send, X } from "lucide-react";
import { useState } from "react";
import {
  buildMailto,
  draftText,
  fmtDate,
  hasValue,
  splitSubject,
  stageOf,
  type Contact,
} from "@/lib/jobi";
import { LinkedInGlyph } from "./icons";
import { copyText, useToast } from "./Toast";
import { SegControl } from "./fields";
import { DocumentPanel } from "../docs/DocumentPanel";

type DmMode = "candidate" | "partner";

function DraftBlock({
  title,
  tag,
  subject,
  body,
  onCopy,
}: {
  title: string;
  tag: string;
  subject: string;
  body: string;
  onCopy: () => void;
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
      <button className="minibtn" type="button" onClick={onCopy}>
        <Copy size={16} />
        Copiar
      </button>
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
  const hasMh = hasValue(contact.email_draft);
  const hasFl = hasValue(contact.email_freelancer);
  const hasDrafts = hasMh || hasFl;
  const hasIntro = hasValue(contact.linkedin_intro);
  const intro = contact.linkedin_intro || "";
  const mh = splitSubject(contact.email_draft, contact);
  const fl = splitSubject(contact.email_freelancer, contact);

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
          <h4>Borradores de email</h4>
          {hasDrafts ? (
            <div className="drafts">
              {hasMh ? (
                <DraftBlock
                  title="Email draft, Make Happen"
                  tag="Empresa"
                  subject={mh.subject}
                  body={mh.body}
                  onCopy={() =>
                    copy(draftText(contact.email_draft, contact), "Email Make Happen copiado")
                  }
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
                      draftText(contact.email_freelancer, contact),
                      "Email freelancer copiado"
                    )
                  }
                />
              ) : null}
            </div>
          ) : (
            <p className="hyp" style={{ color: "var(--muted)" }}>
              {hasValue(contact.contacto_email)
                ? "Todavía no hay borrador para este contacto."
                : "Sin email encontrado, así que no hay borrador. Usa la intro de LinkedIn para abrir conversación."}
            </p>
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

        {hasIntro ? (
          <div className="dsec">
            <h4>
              LinkedIn intro
              <span className="tag">{intro.length} de 300 caracteres</span>
            </h4>
            <div className="draft">
              <pre>{intro}</pre>
              <button
                className="minibtn"
                type="button"
                onClick={() => copy(intro, "Intro de LinkedIn copiada")}
              >
                <Copy size={16} />
                Copiar
              </button>
            </div>
          </div>
        ) : null}

        <div className="dsec">
          <h4>
            Documentos
            <span className="tag">CV · carta · make happen</span>
          </h4>
          <DocumentPanel contact={contact} />
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

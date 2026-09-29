"use client";

import { Briefcase, Check, Copy, Send, X } from "lucide-react";
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

  const copy = async (text: string, message: string) => {
    const ok = await copyText(text);
    notify(ok ? message : "No se pudo copiar");
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

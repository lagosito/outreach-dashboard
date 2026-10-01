// JOBI: shared types, stage mapping and formatting helpers.

export interface Contact {
  id: string;
  empresa: string;
  cargo: string;
  job_link: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_linkedin: string;
  estado: string;
  email_draft: string;
  email_freelancer: string;
  linkedin_intro: string;
  hipotesis: string;
  fecha_envio: string | null;
  fecha_followup_1: string | null;
  fecha_followup_2: string | null;
  gmail_thread_id: string;
  airtable_id: string | null;
  fuente: string | null;
  created_at: string;
  updated_at: string;
  // JOBI v2: LinkedIn-sourced rows (fuente = linkedin) carry their own drafts.
  score?: number | null;
  reason?: string | null;
  draft_dm_candidate?: string | null;
  draft_dm_partner?: string | null;
  draft_comment?: string | null;
}

/** The five workflow states stored in linkedin_engagements.status. */
export type LinkedInStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "published"
  | "needs_review";

export type LinkedInOutcome =
  | "none"
  | "author_reply"
  | "profile_visit"
  | "connection"
  | "dm"
  | "meeting";

/**
 * Statuses written by older scans are still present in some rows, so every
 * read goes through the normaliser: unknown values land in `needs_review`
 * (the amber queue) instead of breaking the counters.
 */
const STATUS_ALIASES: Record<string, LinkedInStatus> = {
  pending: "pending",
  pending_approval: "pending",
  approved: "approved",
  draft_ready: "approved",
  rejected: "rejected",
  discarded: "rejected",
  published: "published",
  needs_review: "needs_review",
};

export function normalizeLinkedInStatus(
  raw: string | null | undefined
): LinkedInStatus {
  if (!raw) return "needs_review";
  return STATUS_ALIASES[raw] ?? "needs_review";
}

export const LINKEDIN_QUEUE_STATUSES: LinkedInStatus[] = [
  "pending",
  "needs_review",
];

export function isQueueStatus(status: LinkedInStatus): boolean {
  return status === "pending" || status === "needs_review";
}

export interface LinkedInRow {
  id: string;
  author_name: string;
  author_role: string | null;
  is_company: boolean;
  post_url: string | null;
  post_text: string | null;
  post_summary: string | null;
  source: string | null;
  keyword: string | null;
  score: number | null;
  status: LinkedInStatus;
  comment_draft: string | null;
  posted_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  // JOBI v2 columns (optional: older rows / demo rows may not carry them).
  post_type?: "conversation" | "hiring" | null;
  angle?: "buyer" | "expert" | "hiring_candidate" | "hiring_partner" | "none" | null;
  language?: "de" | "en" | null;
  register?: "du" | "sie" | "neutral" | null;
  region_signals?: Record<string, unknown> | null;
  score_reason?: string | null;
  author_profile_url?: string | null;
  post_age_hours?: number | null;
  mention_used?: boolean | null;
  draft_dm?: string | null;
  outcome?: LinkedInOutcome | null;
  outcome_at?: string | null;
}

export type StageId =
  | "nuevo"
  | "contacto"
  | "draft"
  | "enviado"
  | "respondio"
  | "descartado";

export interface Stage {
  id: StageId;
  label: string;
}

export const STAGES: Stage[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contacto", label: "Contacto encontrado" },
  { id: "draft", label: "Borrador listo" },
  { id: "enviado", label: "Enviado" },
  { id: "respondio", label: "Respondió" },
  { id: "descartado", label: "Descartado" },
];

// Real values stored in outreach_contacts.estado mapped to the 6 UI stages.
const ESTADO_TO_STAGE: Record<string, StageId> = {
  Nuevo: "nuevo",
  Investigado: "nuevo",
  "Contacto encontrado": "contacto",
  "Draft listo": "draft",
  "FU1 Draft listo": "draft",
  Enviado: "enviado",
  Respondió: "respondio",
  Handoff: "respondio",
  Descartado: "descartado",
  discard: "descartado",
  "Cerrado sin respuesta": "descartado",
};

export function stageOf(estado: string | null | undefined): StageId {
  if (!estado) return "nuevo";
  return ESTADO_TO_STAGE[estado] ?? "nuevo";
}

export function stageLabel(id: StageId): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

export function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let s = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (withTime) {
    s += `, ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  }
  return s;
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function hasValue(v?: string | null): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function isSent(c: Pick<Contact, "fecha_envio">): boolean {
  return hasValue(c.fecha_envio);
}

/**
 * The drafts stored in Supabase are bodies only: there is no subject column.
 * When a stored draft happens to start with an explicit subject line we use it
 * as-is, otherwise the subject is derived from the record (same formula the
 * live dashboard already uses for the mailto link).
 */
const SUBJECT_PREFIX = /^\s*(?:Betreff|Subject|Asunto)\s*:\s*(.+)$/i;

export function splitSubject(draft: string | null | undefined, c: Contact): {
  subject: string;
  body: string;
} {
  const fallback = `Re: ${c.cargo || ""} at ${c.empresa || ""}`.trim();
  if (!hasValue(draft)) return { subject: fallback, body: "" };
  const lines = draft!.split("\n");
  const m = lines[0].match(SUBJECT_PREFIX);
  if (m) {
    return { subject: m[1].trim(), body: lines.slice(1).join("\n").trim() };
  }
  return { subject: fallback, body: draft! };
}

export function draftText(
  draft: string | null | undefined,
  c: Contact
): string {
  const { subject, body } = splitSubject(draft, c);
  if (!body) return "";
  return `Betreff: ${subject}\n\n${body}`;
}

export function buildMailto(c: Contact): string {
  const subject = `Re: ${c.cargo || ""} at ${c.empresa || ""}`.trim();
  const params = new URLSearchParams();
  params.set("cc", "gabriel@makehappen.de");
  params.set("subject", subject);
  if (hasValue(c.email_draft)) params.set("body", c.email_draft as string);
  return `mailto:${c.contacto_email}?${params.toString()}`;
}

export function scoreColor(score: number): string {
  if (score >= 85) return "#3E9A6A";
  if (score >= 70) return "var(--accent)";
  return "var(--s-nuevo-dot)";
}

export const LINKEDIN_TABLE = "linkedin_engagements";

export interface LinkedInCounts {
  /** Rows outside the approval queue (approved + rejected + published). */
  posts: number;
  approved: number;
  rejected: number;
  published: number;
  pending: number;
  needs_review: number;
  /** pending + needs_review: what the amber badge shows. */
  queue: number;
  /** Every row in linkedin_engagements: posts + queue. */
  total: number;
  avg_score: number;
}

export const EMPTY_LINKEDIN_COUNTS: LinkedInCounts = {
  posts: 0,
  approved: 0,
  rejected: 0,
  published: 0,
  pending: 0,
  needs_review: 0,
  queue: 0,
  total: 0,
  avg_score: 0,
};

export const LINKEDIN_STATUS_LABEL: Record<LinkedInStatus, string> = {
  pending: "Pendiente de aprobación",
  approved: "Aprobado",
  rejected: "Rechazado",
  published: "Publicado",
  needs_review: "Revisar",
};

export const LINKEDIN_STATUS_PILL: Record<
  LinkedInStatus,
  "draft" | "publicado" | "descartado"
> = {
  pending: "draft",
  approved: "draft",
  published: "publicado",
  rejected: "descartado",
  needs_review: "draft",
};

export const LINKEDIN_OUTCOME_LABEL: Record<LinkedInOutcome, string> = {
  none: "Sin resultado",
  author_reply: "Respuesta del autor",
  profile_visit: "Visita al perfil",
  connection: "Conexión",
  dm: "DM enviado",
  meeting: "Reunión",
};

export const LINKEDIN_OUTCOMES: LinkedInOutcome[] = [
  "none",
  "author_reply",
  "profile_visit",
  "connection",
  "dm",
  "meeting",
];

/** Outcomes that count as a positive result in the metrics table. */
export const POSITIVE_OUTCOMES: LinkedInOutcome[] = [
  "author_reply",
  "connection",
  "dm",
  "meeting",
];

export function sourceLabel(row: LinkedInRow): string {
  if (row.source === "keyword" && row.keyword) return `Keyword: ${row.keyword}`;
  if (row.source === "feed") return "Tu feed";
  return row.source || "Sin fuente";
}

/**
 * One row per person: the main contact of every record that has a name.
 * Deduplicated by email, then by LinkedIn URL, then by name + company.
 */
export interface Person {
  key: string;
  name: string;
  company: string;
  role: string;
  email: string;
  linkedin: string;
  source: string;
  found: string;
}

export function buildDirectory(contacts: Contact[]): Person[] {
  const out: Person[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    if (!hasValue(c.contacto_nombre)) continue;
    const email = (c.contacto_email || "").trim().toLowerCase();
    const linkedin = (c.contacto_linkedin || "").trim().toLowerCase();
    const key = email
      ? `e:${email}`
      : linkedin
        ? `l:${linkedin}`
        : `n:${(c.contacto_nombre || "").trim().toLowerCase()}|${(
            c.empresa || ""
          ).trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      name: c.contacto_nombre,
      company: c.empresa,
      role: c.cargo,
      email: (c.contacto_email || "").trim(),
      linkedin: (c.contacto_linkedin || "").trim(),
      source: hasValue(c.fuente) ? (c.fuente as string) : "Sin fuente",
      found: c.created_at,
    });
  }
  return out;
}

// Supabase REST API client (no Drizzle, no pg driver)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TABLE = "outreach_contacts";

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
  // Document generation (JOBI fase 3): stored JSON of each generated document.
  doc_cv?: unknown | null;
  doc_anschreiben?: unknown | null;
  doc_mh?: unknown | null;
  vacante_texto?: string | null;
}

interface SupabaseResponse {
  data: Contact[] | null;
  error: { message: string; code: string } | null;
  count?: number;
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "count=exact",
    ...extra,
  };
}

export async function supaGet(
  params: Record<string, string> = {},
  opts: { allStates?: boolean } = {}
): Promise<{ data: Contact[]; total: number }> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
  // Default: exclude descartado, order by created_at desc
  if (!opts.allStates) url.searchParams.set("estado", "not.eq.Descartado");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { headers: headers() });
  const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
  const data: Contact[] = await res.json();
  return { data, total };
}

export async function supaCount(filters: Record<string, string> = {}): Promise<number> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "id");

  for (const [k, v] of Object.entries(filters)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: headers({ Prefer: "count=exact" }),
  });
  return parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
}

export async function supaUpdate(
  id: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  return supaUpdateIn(TABLE, id, patch);
}

export async function supaUpdateIn(
  table: string,
  id: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  return res.ok;
}

/** Reads a single row (all columns) by id. Returns null when not found. */
export async function supaFindById<T>(
  table: string,
  id: string
): Promise<T | null> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) return null;
  const rows: T[] = await res.json();
  return rows[0] ?? null;
}

/** Reads every row of an arbitrary table (used by linkedin_engagements). */
export async function supaAll<T>(
  table: string,
  params: Record<string, string> = {}
): Promise<{ data: T[]; total: number }> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`supaAll(${table}) failed: ${res.status} ${text}`);
  }
  const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
  const data: T[] = await res.json();
  return { data, total };
}

export async function supaSelect(
  query: string,
  filters: Record<string, string> = {}
): Promise<Contact[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
  url.searchParams.set("select", query);

  for (const [k, v] of Object.entries(filters)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { headers: headers() });
  return res.json();
}

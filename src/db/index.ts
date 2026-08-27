// Supabase REST API client (no Drizzle, no pg driver)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;
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
  hipotesis: string;
  fecha_envio: string | null;
  fecha_followup_1: string | null;
  fecha_followup_2: string | null;
  gmail_thread_id: string;
  created_at: string;
  updated_at: string;
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
  params: Record<string, string> = {}
): Promise<{ data: Contact[]; total: number }> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
  // Default: exclude descartado, order by created_at desc
  url.searchParams.set("estado", "not.eq.Descartado");
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
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  return res.ok;
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

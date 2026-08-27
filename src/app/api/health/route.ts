export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return Response.json({ ok: false, error: "Missing env vars" }, { status: 500 });
    }
    const res = await fetch(`${url}/rest/v1/outreach_contacts?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return Response.json({ ok: res.ok, status: res.status });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

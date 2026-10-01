import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn, type Contact } from "@/db";

const TABLE = "outreach_contacts";
const FIELDS = ["draft_dm_candidate", "draft_dm_partner", "draft_comment"] as const;
type Field = (typeof FIELDS)[number];

/**
 * PATCH /api/contacts/update-li
 * Saves the LinkedIn DM/comment drafts edited in the Ofertas detail panel.
 * Only the three draft columns can be written and the id is required, so an
 * accidental call can never blank an unrelated field.
 */
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `${field} must be a string` }, { status: 400 });
    }
    patch[field] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const current = await supaFindById<Contact>(TABLE, id);
  if (!current) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  patch.updated_at = new Date().toISOString();

  const ok = await supaUpdateIn(TABLE, id, patch);
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

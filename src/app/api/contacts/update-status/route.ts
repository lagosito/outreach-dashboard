import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdate, type Contact } from "@/db";

const STATUS_DATE_MAP: Record<string, string> = {
  Enviado: "fecha_envio",
  "Follow-up 1": "fecha_followup_1",
  "Follow-up 2": "fecha_followup_2",
};

/**
 * Changes the state of a contact. No action ever deletes or blanks data:
 * date fields are only written when they are still empty, so an existing
 * fecha_envio is preserved.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, estado } = body;

  if (!id || !estado) {
    return NextResponse.json({ error: "id and estado required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { estado, updated_at: new Date().toISOString() };

  const dateField = STATUS_DATE_MAP[estado];
  if (dateField) {
    const current = await supaFindById<Contact>("outreach_contacts", id);
    const currentValue = current ? (current as unknown as Record<string, unknown>)[dateField] : null;
    const isEmpty = currentValue === null || currentValue === undefined || currentValue === "";
    if (isEmpty) patch[dateField] = new Date().toISOString();
  }

  const ok = await supaUpdate(id, patch);

  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

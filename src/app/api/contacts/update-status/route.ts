import { NextRequest, NextResponse } from "next/server";
import { supaUpdate } from "@/db";

const STATUS_DATE_MAP: Record<string, string> = {
  Enviado: "fecha_envio",
  "Follow-up 1": "fecha_followup_1",
  "Follow-up 2": "fecha_followup_2",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, estado } = body;

  if (!id || !estado) {
    return NextResponse.json({ error: "id and estado required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { estado, updated_at: new Date().toISOString() };

  // Auto-set date field for sent/followup statuses
  const dateField = STATUS_DATE_MAP[estado];
  if (dateField) {
    patch[dateField] = new Date().toISOString();
  }

  const ok = await supaUpdate(id, patch);

  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

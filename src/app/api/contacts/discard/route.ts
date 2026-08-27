import { NextRequest, NextResponse } from "next/server";
import { supaUpdate } from "@/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const ok = await supaUpdate(id, { estado: "Descartado" });

  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn, type Contact } from "@/db";
import {
  DOC_FIELD,
  DOC_TYPES,
  generateDocument,
  type DocContext,
  type DocType,
} from "@/lib/documents";

const TABLE = "outreach_contacts";

function parseTipo(value: unknown): DocType | null {
  return typeof value === "string" && (DOC_TYPES as string[]).includes(value)
    ? (value as DocType)
    : null;
}

/**
 * POST /api/documents
 * Generates one document (cv | cv_anschreiben | mh) for a single offer and
 * stores the resulting JSON in the matching doc_* column. Everything runs
 * server-side: the OpenRouter key and the service_role key never reach the
 * browser.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const tipo = parseTipo(body.tipo);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!tipo) {
    return NextResponse.json(
      { error: `tipo must be one of ${DOC_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const contact = await supaFindById<Contact>(TABLE, id);
  if (!contact) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const vacante =
    typeof body.vacante_texto === "string" && body.vacante_texto.trim()
      ? body.vacante_texto.trim()
      : ((contact as Contact & { vacante_texto?: string | null }).vacante_texto ?? null);
  const instruccion =
    typeof body.instruccion === "string" && body.instruccion.trim()
      ? body.instruccion.trim()
      : null;
  const language =
    body.language === "de" || body.language === "en" ? body.language : undefined;

  const ctx: DocContext = {
    empresa: contact.empresa,
    cargo: contact.cargo,
    hipotesis: contact.hipotesis || null,
    contacto_nombre: contact.contacto_nombre || null,
    vacante_texto: vacante,
    instruccion,
  };

  try {
    const doc = await generateDocument(tipo, ctx, language);
    const patch: Record<string, unknown> = {
      [DOC_FIELD[tipo]]: doc,
      updated_at: new Date().toISOString(),
    };
    if (typeof body.vacante_texto === "string" && body.vacante_texto.trim()) {
      patch.vacante_texto = body.vacante_texto.trim();
    }
    const ok = await supaUpdateIn(TABLE, id, patch);
    if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ success: true, doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * PATCH /api/documents
 * Saves manual edits made in the preview (data) or the pasted vacancy text
 * (vacante_texto). Both are additive writes to a single row.
 */
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const tipo = parseTipo(body.tipo);
  const patch: Record<string, unknown> = {};

  if (tipo && body.data !== undefined) {
    if (body.data === null || typeof body.data !== "object") {
      return NextResponse.json({ error: "data must be an object" }, { status: 400 });
    }
    patch[DOC_FIELD[tipo]] = {
      ...(body.data as Record<string, unknown>),
      language:
        (body.data as { language?: string }).language ?? "de",
      generated_at: new Date().toISOString(),
      edited_by: "manual",
    };
  }

  if (typeof body.vacante_texto === "string") {
    patch.vacante_texto = body.vacante_texto.trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const current = await supaFindById<Contact>(TABLE, id);
  if (!current) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  patch.updated_at = new Date().toISOString();
  const ok = await supaUpdateIn(TABLE, id, patch);
  if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

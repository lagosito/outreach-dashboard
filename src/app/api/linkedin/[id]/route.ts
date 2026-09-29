import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn } from "@/db";
import { LINKEDIN_TABLE, type LinkedInRow } from "@/lib/jobi";

const ALLOWED_STATUS = new Set([
  "pending_approval",
  "draft_ready",
  "published",
  "discarded",
]);

/**
 * PATCH /api/linkedin/[id]
 * Edits the comment draft and/or moves the row through the workflow.
 * Nothing is ever deleted: status changes only add timestamps when missing.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await supaFindById<LinkedInRow>(LINKEDIN_TABLE, id);
  if (!current) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  let hasChange = false;

  if (typeof body.comment_draft === "string") {
    patch.comment_draft = body.comment_draft;
    hasChange = true;
  }

  if (typeof body.status === "string") {
    if (!ALLOWED_STATUS.has(body.status)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    patch.status = body.status;
    const now = new Date().toISOString();
    if (body.status === "draft_ready" && !current.approved_at) {
      patch.approved_at = now;
    }
    if (body.status === "published" && !current.published_at) {
      patch.published_at = now;
    }
    hasChange = true;
  }

  if (!hasChange) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const ok = await supaUpdateIn(LINKEDIN_TABLE, id, patch);
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

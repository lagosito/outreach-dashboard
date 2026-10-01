import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn } from "@/db";
import {
  LINKEDIN_OUTCOMES,
  LINKEDIN_TABLE,
  type LinkedInOutcome,
  type LinkedInRow,
  type LinkedInStatus,
} from "@/lib/jobi";

const ALLOWED_STATUS = new Set<LinkedInStatus>([
  "pending",
  "approved",
  "rejected",
  "published",
  "needs_review",
]);

const ALLOWED_OUTCOME = new Set<LinkedInOutcome>(LINKEDIN_OUTCOMES);

/**
 * PATCH /api/linkedin/[id]
 * Edits the comment draft, records the outcome of a published post and/or
 * moves the row through the workflow. Status accepts only the five current
 * values and outcome only the six outcome values. Nothing is ever deleted:
 * status changes only add timestamps when missing.
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
    if (!ALLOWED_STATUS.has(body.status as LinkedInStatus)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    patch.status = body.status;
    const now = new Date().toISOString();
    if (body.status === "approved" && !current.approved_at) {
      patch.approved_at = now;
    }
    if (body.status === "published" && !current.published_at) {
      patch.published_at = now;
    }
    hasChange = true;
  }

  if (typeof body.outcome === "string") {
    if (!ALLOWED_OUTCOME.has(body.outcome as LinkedInOutcome)) {
      return NextResponse.json({ error: "Unknown outcome" }, { status: 400 });
    }
    patch.outcome = body.outcome;
    if (typeof body.outcome_at === "string" && body.outcome_at) {
      patch.outcome_at = body.outcome_at;
    } else {
      patch.outcome_at =
        body.outcome === "none" ? null : new Date().toISOString();
    }
    hasChange = true;
  } else if (typeof body.outcome_at === "string") {
    patch.outcome_at = body.outcome_at || null;
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

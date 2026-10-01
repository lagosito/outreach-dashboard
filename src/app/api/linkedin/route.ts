import { NextRequest, NextResponse } from "next/server";
import { supaAll } from "@/db";
import {
  LINKEDIN_TABLE,
  isQueueStatus,
  normalizeLinkedInStatus,
  type LinkedInCounts,
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

/**
 * Every row belongs to exactly one of the five buckets after normalisation,
 * so `pending + approved + rejected + published + needs_review === total` and
 * `posts + queue === total` always hold.
 */
function counts(rows: LinkedInRow[]): LinkedInCounts {
  const normalized = rows.map((row) => ({
    ...row,
    status: normalizeLinkedInStatus(row.status as unknown as string),
  }));
  const bucket = (status: LinkedInStatus) =>
    normalized.filter((r) => r.status === status).length;

  const pending = bucket("pending");
  const approved = bucket("approved");
  const rejected = bucket("rejected");
  const published = bucket("published");
  const needsReview = bucket("needs_review");
  const queue = pending + needsReview;

  const scores = normalized
    .filter((r) => !isQueueStatus(r.status))
    .map((r) => Number(r.score) || 0);
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    posts: normalized.length - queue,
    approved,
    rejected,
    published,
    pending,
    needs_review: needsReview,
    queue,
    total: normalized.length,
    avg_score: avg,
  };
}

/**
 * GET /api/linkedin
 * Returns the filtered rows plus the unfiltered counters used by the KPI
 * strip. Rows waiting for approval (pending + needs_review) live in the
 * queue: they are returned separately and hidden from the table unless the
 * status filter asks for them explicitly.
 *
 * Statuses are normalised on the way out so the UI only ever sees the five
 * current values, even when an older scan wrote a legacy one.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;

  const search = (sp.get("search") || "").replace(/[(),]/g, " ").trim().toLowerCase();
  const status = sp.get("status") || "";
  const explicitStatus = status && ALLOWED_STATUS.has(status as LinkedInStatus)
    ? (status as LinkedInStatus)
    : "";
  const publicado = sp.get("publicado") || "";
  const scoreMin = parseInt(sp.get("scoreMin") || "0", 10) || 0;
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  try {
    const all = await supaAll<LinkedInRow>(LINKEDIN_TABLE, {});
    const rows: LinkedInRow[] = all.data.map((row) => ({
      ...row,
      status: normalizeLinkedInStatus(row.status as unknown as string),
    }));

    const filtered = rows.filter((row) => {
      if (explicitStatus) {
        if (row.status !== explicitStatus) return false;
      } else if (isQueueStatus(row.status)) {
        return false;
      }
      if (publicado === "si" && row.status !== "published") return false;
      if (publicado === "no" && row.status === "published") return false;
      if (scoreMin > 0 && (Number(row.score) || 0) < scoreMin) return false;
      const day = (row.created_at || "").slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (search) {
        const haystack =
          `${row.author_name} ${row.author_role || ""} ${row.post_summary || ""} ${
            row.post_text || ""
          } ${row.keyword || ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const queue = rows.filter((row) => isQueueStatus(row.status));

    return NextResponse.json({
      rows: filtered,
      total: all.total,
      queue,
      counts: counts(rows),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

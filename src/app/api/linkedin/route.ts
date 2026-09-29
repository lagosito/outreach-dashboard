import { NextRequest, NextResponse } from "next/server";
import { supaAll } from "@/db";
import { LINKEDIN_TABLE, type LinkedInCounts, type LinkedInRow } from "@/lib/jobi";

const ALLOWED_STATUS = new Set([
  "pending_approval",
  "draft_ready",
  "published",
  "discarded",
]);

function counts(rows: LinkedInRow[]): LinkedInCounts {
  const posts = rows.filter((r) => r.status !== "pending_approval");
  const scores = posts.map((r) => Number(r.score) || 0);
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  return {
    posts: posts.length,
    draft_ready: posts.filter((r) => r.status === "draft_ready").length,
    published: posts.filter((r) => r.status === "published").length,
    avg_score: avg,
    queue: rows.filter((r) => r.status === "pending_approval").length,
  };
}

/**
 * GET /api/linkedin
 * Returns the filtered rows plus the unfiltered counters used by the KPI
 * strip. Rows waiting for approval live in the queue, so they are excluded
 * from the table unless the status filter asks for them explicitly.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;

  const and: string[] = ["status.neq.pending_approval"];
  const or: string[] = [];

  const search = (sp.get("search") || "").replace(/[(),]/g, " ").trim();
  if (search) {
    or.push(
      `author_name.ilike.%${search}%`,
      `author_role.ilike.%${search}%`,
      `post_text.ilike.%${search}%`,
      `post_summary.ilike.%${search}%`
    );
  }

  const status = sp.get("status") || "";
  if (status && ALLOWED_STATUS.has(status)) {
    and.push(`status.eq.${status}`);
    // an explicit status filter replaces the default "hide the queue" rule
    if (status === "pending_approval") and.shift();
  }

  const publicado = sp.get("publicado") || "";
  if (publicado === "si") and.push("status.eq.published");
  else if (publicado === "no") and.push("status.neq.published");

  const scoreMin = parseInt(sp.get("scoreMin") || "0", 10);
  if (scoreMin > 0) and.push(`score.gte.${scoreMin}`);

  const from = sp.get("from") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) and.push(`created_at.gte.${from}T00:00:00`);
  const to = sp.get("to") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) and.push(`created_at.lte.${to}T23:59:59`);

  const params: Record<string, string> = {};
  if (or.length) params.or = `(${or.join(",")})`;
  if (and.length) params.and = `(${and.join(",")})`;

  try {
    const filtered = await supaAll<LinkedInRow>(LINKEDIN_TABLE, params);
    const all = await supaAll<LinkedInRow>(LINKEDIN_TABLE, {});
    return NextResponse.json({
      rows: filtered.data,
      total: filtered.total,
      queue: all.data.filter((row) => row.status === "pending_approval"),
      counts: counts(all.data),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

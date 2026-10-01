import { NextResponse } from "next/server";
import { supaAll } from "@/db";
import {
  LINKEDIN_TABLE,
  POSITIVE_OUTCOMES,
  normalizeLinkedInStatus,
  type LinkedInRow,
} from "@/lib/jobi";

const WINDOW_DAYS = 14;

export interface KeywordMetric {
  keyword: string;
  /** Results collected for this query over the last 14 days. */
  results: number;
  /** Of those results, how many passed the DACH filter. */
  passed_dach: number;
  /** Posts of this keyword with status = approved. */
  approved: number;
  /** Posts of this keyword whose outcome is a positive one. */
  outcomes: number;
}

interface KeywordStat {
  query: string;
  day: string;
  results: number | null;
  passed_dach: number | null;
}

/**
 * GET /api/linkedin/metrics
 * Per-keyword metrics for the last 14 days: scan results (summed per query
 * from linkedin_keyword_stats) plus approved posts and positive outcomes
 * from linkedin_engagements. Keywords are unioned across both sources so a
 * query that only shows up in one of them still gets a row.
 */
export async function GET() {
  try {
    const since = new Date(Date.now() - (WINDOW_DAYS - 1) * 86400000)
      .toISOString()
      .slice(0, 10);

    const [stats, engagements] = await Promise.all([
      supaAll<KeywordStat>("linkedin_keyword_stats", { order: "day.desc" }),
      supaAll<LinkedInRow>(LINKEDIN_TABLE, {}),
    ]);

    const byKeyword = new Map<string, KeywordMetric>();
    const row = (keyword: string): KeywordMetric => {
      const existing = byKeyword.get(keyword);
      if (existing) return existing;
      const fresh: KeywordMetric = {
        keyword,
        results: 0,
        passed_dach: 0,
        approved: 0,
        outcomes: 0,
      };
      byKeyword.set(keyword, fresh);
      return fresh;
    };

    for (const stat of stats.data || []) {
      if (!stat.query) continue;
      if ((stat.day || "").slice(0, 10) < since) continue;
      const target = row(stat.query);
      target.results += Number(stat.results) || 0;
      target.passed_dach += Number(stat.passed_dach) || 0;
    }

    for (const post of engagements.data || []) {
      const keyword = (post.keyword || "").trim();
      if (!keyword) continue;
      const target = row(keyword);
      if (normalizeLinkedInStatus(post.status as unknown as string) === "approved") {
        target.approved += 1;
      }
      if (POSITIVE_OUTCOMES.includes(post.outcome || "none")) {
        target.outcomes += 1;
      }
    }

    const keywords = [...byKeyword.values()].sort(
      (a, b) =>
        b.results - a.results ||
        b.approved - a.approved ||
        b.outcomes - a.outcomes ||
        a.keyword.localeCompare(b.keyword)
    );

    return NextResponse.json({
      since,
      days: WINDOW_DAYS,
      keywords,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

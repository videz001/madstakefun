import { NextRequest, NextResponse } from "next/server";
import { buildLeaderboard, getPeriodWindow, type Period } from "@/lib/leaderboard";

// Leaderboard for a period: ?period=week (default) | month | all.
// Ranked by ATOM staked in that window; each row carries the lifetime total.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("period");
  const period: Period = p === "month" || p === "all" ? p : "week";

  const rows = await buildLeaderboard(period);
  const { start, end } = getPeriodWindow(period);

  return NextResponse.json({
    period,
    rows,
    window: start && end ? { start: start.toISOString(), end: end.toISOString() } : null,
  });
}

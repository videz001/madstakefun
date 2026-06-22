import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { prisma } from "@/lib/db";
import { getDelegatedAtom } from "@/lib/cosmos";
import { getWeekWindow } from "@/lib/leaderboard";

function authed(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || req.headers.get("x-admin-key");
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

// Admin-only: every user who interacted with the app, with weekly + lifetime stake.
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await store.allUsers();
  const { start, end } = getWeekWindow();
  const sums = await prisma.stakeEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const weeklyById = new Map(sums.map((s) => [s.userId, s._sum.amount || 0]));

  const rows = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      evmAddress: u.evmAddress,
      cosmosAddress: u.cosmosAddress || null,
      xUsername: u.xUsername || null,
      xUserId: u.xUserId || null,
      createdAt: u.createdAt,
      weeklyAtom: weeklyById.get(u.id) || 0,
      totalAtom: u.cosmosAddress ? await getDelegatedAtom(u.cosmosAddress) : 0,
    }))
  );
  rows.sort((a, b) => b.weeklyAtom - a.weeklyAtom || b.totalAtom - a.totalAtom);

  return NextResponse.json({ count: rows.length, users: rows });
}

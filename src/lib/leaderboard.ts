import { prisma } from "@/lib/db";
import { getDelegatedAtom } from "@/lib/cosmos";

const TZ = "America/New_York"; // "EST" with automatic DST handling

// ms to add to a UTC instant to get the wall-clock time in TZ at that instant.
function tzOffsetMs(d: Date): number {
  const asTz = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const asUtc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  return asTz.getTime() - asUtc.getTime();
}

// Convert ET wall-clock fields to the exact UTC instant, DST-safe. The offset is
// resolved AT THE BOUNDARY (not at "now"), and refined once in case the boundary
// straddles a DST change. Date.UTC normalizes day/month overflow (e.g. day 0,
// day 32, month 12), so callers can pass arithmetic results directly.
function zonedWallToUtc(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  const off1 = tzOffsetMs(new Date(guess));
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc));
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
}

// ET wall-clock date parts of an instant.
function nyWall(now: Date) {
  const w = new Date(now.getTime() + tzOffsetMs(now));
  return {
    y: w.getUTCFullYear(),
    mo: w.getUTCMonth(),
    d: w.getUTCDate(),
    dow: w.getUTCDay(), // 0=Sun..6=Sat
  };
}

export type Period = "week" | "month" | "all";

// Current weekly window: Monday 00:00 ET (inclusive) → next Monday 00:00 ET.
// Both boundaries are computed as true ET midnights, so a DST change inside the
// week never shifts the reset off midnight.
export function getWeekWindow(now: Date = new Date()): { start: Date; end: Date } {
  const { y, mo, d, dow } = nyWall(now);
  const sinceMon = (dow + 6) % 7; // Mon=0
  const start = zonedWallToUtc(y, mo, d - sinceMon, 0, 0, 0);
  const end = zonedWallToUtc(y, mo, d - sinceMon + 7, 0, 0, 0);
  return { start, end };
}

// Current calendar month in ET: 1st 00:00 ET → 1st of next month 00:00 ET.
export function getMonthWindow(now: Date = new Date()): { start: Date; end: Date } {
  const { y, mo } = nyWall(now);
  const start = zonedWallToUtc(y, mo, 1, 0, 0, 0);
  const end = zonedWallToUtc(y, mo + 1, 1, 0, 0, 0);
  return { start, end };
}

// Window for a given period. "all" has no time bounds.
export function getPeriodWindow(period: Period): { start?: Date; end?: Date } {
  if (period === "all") return {};
  if (period === "month") return getMonthWindow();
  return getWeekWindow();
}

export type LeaderboardRow = {
  rank: number;
  evmAddress: string;
  cosmosAddress: string;
  xUsername?: string;
  xAvatarUrl?: string;
  periodAtom: number; // ATOM staked within the selected period (ranks the board)
  totalAtom: number; // lifetime ATOM currently delegated on-chain
};

const cache = new Map<Period, { at: number; rows: LeaderboardRow[] }>();
const TTL_MS = 90_000;

// Ranked by ATOM staked in the selected period (descending). Lifetime total is
// read live from chain for the small secondary number.
// Pass { noCache: true } to force a fresh DB read (e.g. the share card, which
// must reflect a just-made stake immediately).
export async function buildLeaderboard(
  period: Period = "week",
  opts: { noCache?: boolean } = {}
): Promise<LeaderboardRow[]> {
  const cached = cache.get(period);
  if (!opts.noCache && cached && Date.now() - cached.at < TTL_MS) return cached.rows;

  const { start, end } = getPeriodWindow(period);
  const where = start && end ? { createdAt: { gte: start, lt: end } } : {};

  const sums = await prisma.stakeEvent.groupBy({
    by: ["userId"],
    where,
    _sum: { amount: true },
  });

  const userIds = sums.map((s) => s.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const byId = new Map(users.map((u) => [u.id, u]));

  const rows = await Promise.all(
    sums.map(async (s) => {
      const u = byId.get(s.userId);
      if (!u || !u.cosmosAddress) return null;
      return {
        evmAddress: u.evmAddress,
        cosmosAddress: u.cosmosAddress,
        xUsername: u.xUsername || undefined,
        xAvatarUrl: u.xAvatarUrl || undefined,
        periodAtom: s._sum.amount || 0,
        totalAtom: await getDelegatedAtom(u.cosmosAddress),
      };
    })
  );

  const ranked = rows
    .filter((r): r is NonNullable<typeof r> => !!r && r.periodAtom > 0)
    .sort((a, b) => b.periodAtom - a.periodAtom)
    .map((r, i) => ({ rank: i + 1, ...r }));

  cache.set(period, { at: Date.now(), rows: ranked });
  return ranked;
}

export function rankForAddress(rows: LeaderboardRow[], cosmosAddress: string) {
  return rows.find((r) => r.cosmosAddress === cosmosAddress) || null;
}

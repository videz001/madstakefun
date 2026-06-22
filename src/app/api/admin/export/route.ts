import { NextRequest } from "next/server";
import { buildLeaderboard } from "@/lib/leaderboard";

function authed(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || req.headers.get("x-admin-key");
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function csv(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Admin-only CSV export of the weekly leaderboard with FULL wallet addresses.
export async function GET(req: NextRequest) {
  if (!authed(req)) return new Response("unauthorized", { status: 401 });

  const p = req.nextUrl.searchParams.get("period");
  const period = p === "month" || p === "all" ? p : "week";
  const rows = await buildLeaderboard(period);
  const header = ["rank", "x_username", "evm_address", "cosmos_address", "period_atom", "total_atom"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.rank, r.xUsername || "", r.evmAddress, r.cosmosAddress, r.periodAtom, r.totalAtom]
        .map(csv)
        .join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cosmos-fast-pass-leaderboard.csv"`,
    },
  });
}

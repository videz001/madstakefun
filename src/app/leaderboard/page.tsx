"use client";

import { useEffect, useState } from "react";

type Period = "week" | "month" | "all";

type Row = {
  rank: number;
  evmAddress: string;
  cosmosAddress: string;
  xUsername?: string;
  xAvatarUrl?: string;
  periodAtom: number;
  totalAtom: number;
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

function fmtRange(period: Period, startIso?: string, endIso?: string) {
  if (period === "all" || !startIso || !endIso) return "";
  const opts: Intl.DateTimeFormatOptions = { timeZone: "America/New_York", month: "short", day: "numeric" };
  const s = new Date(startIso).toLocaleDateString("en-US", opts);
  const last = new Date(new Date(endIso).getTime() - 24 * 3600 * 1000);
  const e = last.toLocaleDateString("en-US", opts);
  return `${s} – ${e} ET`;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<Row[]>([]);
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setRange(fmtRange(period, d.window?.start, d.window?.end));
      })
      .finally(() => setLoading(false));
  }, [period]);

  const heading =
    period === "week" ? "Weekly Leaderboard" : period === "month" ? "Monthly Leaderboard" : "All-Time Leaderboard";
  const metric =
    period === "week" ? "ATOM this week" : period === "month" ? "ATOM this month" : "ATOM staked";

  return (
    <main>
      <div className="eyebrow">{period === "all" ? "All time" : `This ${period}`}{range ? ` · ${range}` : ""}</div>
      <h1>{heading}</h1>
      <p className="muted">
        {period === "all"
          ? "Ranked by total ATOM staked through the app, all time."
          : `Ranked by ATOM staked ${period === "week" ? "this week (resets Monday 00:00 ET)" : "this calendar month (ET)"}. Lifetime total in grey.`}
      </p>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="card">
              <p className="muted">No stakes in this period yet. Stake some ATOM through the app to claim the top spot.</p>
            </div>
          ) : (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Profile</th>
                    <th>Cosmos address</th>
                    <th style={{ textAlign: "right" }}>{metric}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.cosmosAddress}>
                      <td className="rank">{String(r.rank).padStart(2, "0")}</td>
                      <td>
                        <div className="row">
                          {r.xAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="avatar" src={r.xAvatarUrl} alt="" />
                          ) : (
                            <div className="avatar" />
                          )}
                          <span>{r.xUsername ? `@${r.xUsername}` : r.evmAddress.slice(0, 8) + "…"}</span>
                        </div>
                      </td>
                      <td className="mono">{r.cosmosAddress.slice(0, 14)}…</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 700 }}>{r.periodAtom.toFixed(2)}</span>
                        {period !== "all" && (
                          <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>
                            / {r.totalAtom.toFixed(2)} total
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: "0 0 200px" }}>
          <div className="card" style={{ marginTop: 0 }}>
            <h2>Leaderboards</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`btn ${period === p.key ? "" : "secondary"}`}
                  style={{ textAlign: "left" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

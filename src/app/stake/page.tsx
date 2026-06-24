"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StakeWidget } from "@/components/StakeWidget";
import { getAtomBalance, getDelegatedAtom } from "@/lib/cosmos";

type Me = {
  evmAddress: string;
  cosmosAddress?: string;
  xUsername?: string;
} | null;

export default function StakePage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [delegated, setDelegated] = useState<number | null>(null);
  const [weekRow, setWeekRow] = useState<any>(null);
  const [allRow, setAllRow] = useState<any>(null);
  const [cardKey, setCardKey] = useState(0); // bumps to refresh the card images

  async function loadChain(addr: string) {
    getAtomBalance(addr).then(setBalance).catch(() => {});
    getDelegatedAtom(addr).then(setDelegated).catch(() => {});
    // find this user's row on the weekly + all-time boards
    Promise.all([
      fetch("/api/leaderboard?period=week").then((r) => r.json()),
      fetch("/api/leaderboard?period=all").then((r) => r.json()),
    ])
      .then(([w, a]) => {
        setWeekRow((w.rows || []).find((x: any) => x.cosmosAddress === addr) || null);
        setAllRow((a.rows || []).find((x: any) => x.cosmosAddress === addr) || null);
      })
      .catch(() => {});
    setCardKey(Date.now()); // unique per fetch so the browser never serves a stale card
  }

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
    if (data.user?.cosmosAddress) loadChain(data.user.cosmosAddress);
  }
  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <p className="muted">Loading…</p>;

  if (!me?.cosmosAddress) {
    return (
      <div className="card">
        <p>You need a Cosmos profile first.</p>
        <Link className="btn" href="/profile">Go to profile</Link>
      </div>
    );
  }

  const addr = encodeURIComponent(me.cosmosAddress);
  const staked = (delegated ?? 0) > 0;

  function shareUrlFor(period: "week" | "all", row: any) {
    const when = period === "all" ? "all-time" : "this week";
    const amt = row?.periodAtom != null ? row.periodAtom.toFixed(2) : "0";
    const text =
      `I've staked ${amt} ATOM ${when} on Cosmos Hub` +
      (row?.rank ? ` and I'm ranked #${row.rank} ${when}` : "") +
      ` on madstake.fun ⚛️\n\nOne click from EVM into Cosmos — climb the board 👇`;
    // Link to a share page whose OG image is the card — X unfurls it so the
    // ranking card appears embedded in the tweet automatically.
    const shareLink = `${window.location.origin}/share/${encodeURIComponent(me!.cosmosAddress!)}?period=${period}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`;
  }

  return (
    <main>
      <div className="eyebrow">Step 05 · Delegate</div>
      <h1>Stake <span className="accent">ATOM</span></h1>
      <p className="muted">Delegate to any active Cosmos Hub validator. Signed in your Cosmos wallet.</p>

      <div className="card lit">
        <span className="stepnum">05</span>
        <div className="spread">
          <span>Liquid ATOM</span>
          <span className="pill on">{balance == null ? "…" : `${balance.toFixed(2)}`}</span>
        </div>
        <div className="spread">
          <span>Currently delegated</span>
          <span className="pill on">{delegated == null ? "…" : `${delegated.toFixed(2)}`}</span>
        </div>
        <p className="mono muted" style={{ marginTop: 8 }}>{me.cosmosAddress}</p>
      </div>

      <div className="card">
        <h2>Delegate</h2>
        <StakeWidget onStaked={() => me.cosmosAddress && loadChain(me.cosmosAddress)} />
      </div>

      {staked && (
        <div className="card lit">
          <h2>Share your rank</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Post the weekly card to compete, or the all-time card to flex your total.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { period: "week" as const, title: "This week", row: weekRow },
              { period: "all" as const, title: "All time", row: allRow },
            ].map(({ period, title, row }) => (
              <div key={period} style={{ flex: "1 1 300px", minWidth: 0 }}>
                <div className="spread" style={{ margin: "0 0 8px" }}>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>{title}</span>
                  <span className="pill on">
                    {row ? `#${row.rank} · ${row.periodAtom.toFixed(2)} ATOM` : "unranked"}
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${period}-${cardKey}`}
                  src={`/api/card?address=${addr}&period=${period}&v=${cardKey}`}
                  alt={`${title} rank card`}
                  style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <a className="btn" href={shareUrlFor(period, row)} target="_blank" rel="noreferrer">Share on X</a>
                  <a className="btn secondary" href={`/api/card?address=${addr}&period=${period}&download=1`} download>Download</a>
                </div>
              </div>
            ))}
          </div>
          {!me.xUsername && (
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              Tip: link your X on the profile page to put your avatar and handle on the cards.
            </p>
          )}
        </div>
      )}

      <div className="row">
        <Link className="btn secondary" href="/fund">← Need more ATOM</Link>
        <Link className="btn" href="/leaderboard">See your rank →</Link>
      </div>
    </main>
  );
}

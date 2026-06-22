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
  const [rank, setRank] = useState<number | null>(null);
  const [cardKey, setCardKey] = useState(0); // bumps to refresh the card image

  async function loadChain(addr: string) {
    getAtomBalance(addr).then(setBalance).catch(() => {});
    getDelegatedAtom(addr).then(setDelegated).catch(() => {});
    // find rank from the leaderboard
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        const row = (d.rows || []).find((x: any) => x.cosmosAddress === addr);
        setRank(row?.rank ?? null);
      })
      .catch(() => {});
    setCardKey((k) => k + 1);
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

  const cardUrl = `/api/card?address=${encodeURIComponent(me.cosmosAddress)}&v=${cardKey}`;
  const downloadUrl = `/api/card?address=${encodeURIComponent(me.cosmosAddress)}&download=1`;
  const shareText =
    `I just staked ${delegated?.toFixed(2) ?? ""} ATOM on Cosmos Hub` +
    (rank ? ` and I'm ranked #${rank}` : "") +
    ` on the Cosmos Fast Pass leaderboard! ⚛️\n\nTurn your EVM wallet into a Cosmos profile and climb 👇`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const staked = (delegated ?? 0) > 0;

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
            Show off your Cosmos debut and bring more EVM users on-chain.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={cardKey}
            src={cardUrl}
            alt="Your Cosmos Fast Pass rank card"
            style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
          />
          <div className="row" style={{ marginTop: 14 }}>
            <a className="btn" href={shareUrl} target="_blank" rel="noreferrer">
              Share on X
            </a>
            <a className="btn secondary" href={downloadUrl} download>
              Download card
            </a>
          </div>
          {!me.xUsername && (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Tip: link your X on the profile page to put your avatar and handle on the card.
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

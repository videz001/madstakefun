"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkipFundWidget } from "@/components/SkipFundWidget";
import { getAtomBalance } from "@/lib/cosmos";

type Me = { evmAddress: string; cosmosAddress?: string } | null;

export default function FundPage() {
  const [me, setMe] = useState<Me>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
    if (data.user?.cosmosAddress) {
      // Read-side LCD call; runs client-side here for a quick funded check.
      getAtomBalance(data.user.cosmosAddress).then(setBalance).catch(() => {});
    }
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

  return (
    <main>
      <h1>Fund with ATOM</h1>
      <p className="muted">
        Route a small amount of any supported EVM asset into ATOM on Cosmos Hub.
      </p>

      <div className="card">
        <div className="spread">
          <span>Your Cosmos Hub address</span>
          <span className="pill">{balance == null ? "checking…" : `${balance.toFixed(2)} ATOM`}</span>
        </div>
        <p className="mono">{me.cosmosAddress}</p>
        <p className="muted" style={{ fontSize: 13 }}>
          In the widget below, connect this Cosmos wallet (Keplr/Leap) as the
          destination. Fallback: send ATOM here manually from any exchange/wallet.
        </p>
      </div>

      <div className="card">
        <SkipFundWidget cosmosAddress={me.cosmosAddress} evmAddress={me.evmAddress} />
      </div>

      <div className="card">
        <button className="btn secondary" onClick={refresh}>Refresh balance</button>
        {balance != null && balance > 0 && (
          <Link className="btn" href="/stake" style={{ marginLeft: 8 }}>
            Funded — stake →
          </Link>
        )}
      </div>
    </main>
  );
}

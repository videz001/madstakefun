"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCosmosAddress, type CosmosProvider } from "@/lib/cosmosWallet";

type Me = {
  evmAddress: string;
  cosmosAddress?: string;
  xUsername?: string;
  xAvatarUrl?: string;
} | null;

export default function ProfilePage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<CosmosProvider | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detected, setDetected] = useState({ keplr: false, leap: false });

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
    setDetected({
      keplr: !!(window as any).keplr,
      leap: !!(window as any).leap,
    });
  }, []);

  async function createCosmosProfile(provider: CosmosProvider) {
    setBusy(provider);
    setErr(null);
    try {
      const cosmosAddress = await getCosmosAddress(provider);
      const res = await fetch("/api/profile/cosmos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cosmosAddress }),
      });
      if (!res.ok) throw new Error("could not save cosmos address");
      // Remember which wallet so the stake step signs with the same one.
      localStorage.setItem("cfp_cosmos_provider", provider);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "connection failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!me)
    return (
      <div className="card">
        <p>You are not signed in.</p>
        <Link className="btn" href="/">Connect a wallet</Link>
      </div>
    );

  return (
    <main>
      <h1>Cosmos profile</h1>

      <div className="card">
        <div className="row">
          {me.xAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={me.xAvatarUrl} alt="" />
          ) : (
            <div className="avatar" />
          )}
          <div style={{ flex: 1 }}>
            <div>{me.xUsername ? `@${me.xUsername}` : "No X linked yet"}</div>
            <div className="muted mono">{me.evmAddress}</div>
          </div>
          {!me.xUsername && (
            <a className="btn secondary" href="/api/auth/x/start">Link X</a>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Cosmos Hub address</h2>
        {me.cosmosAddress ? (
          <p className="mono">{me.cosmosAddress}</p>
        ) : (
          <>
            <p className="muted">
              Install a Cosmos browser wallet, then connect it to mint your Cosmos
              Hub account. This is the address you'll fund and stake from — you only
              approve popups, you never enter a seed phrase here.
            </p>
            <div className="row">
              {detected.keplr ? (
                <button className="btn" onClick={() => createCosmosProfile("keplr")} disabled={!!busy}>
                  {busy === "keplr" ? "Connecting Keplr…" : "Connect Keplr"}
                </button>
              ) : (
                <a className="btn" href="https://www.keplr.app/download" target="_blank" rel="noreferrer">
                  Install Keplr ↗
                </a>
              )}
              {detected.leap ? (
                <button className="btn secondary" onClick={() => createCosmosProfile("leap")} disabled={!!busy}>
                  {busy === "leap" ? "Connecting Leap…" : "Connect Leap"}
                </button>
              ) : (
                <a className="btn secondary" href="https://www.leapwallet.io/download" target="_blank" rel="noreferrer">
                  Install Leap ↗
                </a>
              )}
            </div>
            {!detected.keplr && !detected.leap && (
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                After installing, refresh this page and a Connect button appears.
              </p>
            )}
            <details style={{ marginTop: 14 }}>
              <summary className="muted" style={{ cursor: "pointer", fontSize: 12 }}>
                Advanced: use the MetaMask Snap instead (EVM-only, needs Flask if not allowlisted)
              </summary>
              <div style={{ marginTop: 10 }}>
                <button className="btn secondary" onClick={() => createCosmosProfile("snap")} disabled={!!busy}>
                  {busy === "snap" ? "Connecting Snap…" : "MetaMask Snap"}
                </button>
              </div>
            </details>
          </>
        )}
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      </div>

      <div className="card">
        <h2>Next steps</h2>
        <p className="muted">Fund your Cosmos address with ATOM, then stake to climb the board.</p>
        <div className="row">
          {me.cosmosAddress && (
            <>
              <Link className="btn" href="/fund">Fund with ATOM →</Link>
              <Link className="btn secondary" href="/stake">Stake</Link>
            </>
          )}
          <Link className="btn secondary" href="/leaderboard">Leaderboard</Link>
        </div>
      </div>
    </main>
  );
}

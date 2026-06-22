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

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
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

  async function disconnectX() {
    if (!confirm("Disconnect your X account from this profile?")) return;
    await fetch("/api/profile/x", { method: "DELETE" });
    await refresh();
  }

  async function disconnectCosmos() {
    if (!confirm("Disconnect your Cosmos wallet? You can reconnect anytime.")) return;
    await fetch("/api/profile/cosmos", { method: "DELETE" });
    localStorage.removeItem("cfp_cosmos_provider");
    await refresh();
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
          {me.xUsername ? (
            <button className="btn secondary" onClick={disconnectX}>Disconnect X</button>
          ) : (
            <a className="btn secondary" href="/api/auth/x/start">Link X</a>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Cosmos Hub address</h2>
        {me.cosmosAddress ? (
          <div className="spread">
            <p className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{me.cosmosAddress}</p>
            <button className="btn secondary" onClick={disconnectCosmos} style={{ flexShrink: 0 }}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <p className="muted">
              Connect a Cosmos browser wallet to mint your Cosmos Hub account. You
              only approve popups — you never enter a seed phrase here.
            </p>
            <div className="row">
              <button className="btn" onClick={() => createCosmosProfile("keplr")} disabled={!!busy}>
                {busy === "keplr" ? "Connecting Keplr…" : "Connect Keplr"}
              </button>
              <button className="btn secondary" onClick={() => createCosmosProfile("leap")} disabled={!!busy}>
                {busy === "leap" ? "Connecting Leap…" : "Connect Leap"}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Don&apos;t have one? Install{" "}
              <a href="https://www.keplr.app/download" target="_blank" rel="noreferrer" style={{ color: "var(--acid)" }}>Keplr</a>{" "}
              or{" "}
              <a href="https://www.leapwallet.io/download" target="_blank" rel="noreferrer" style={{ color: "var(--acid)" }}>Leap</a>,
              then reload this page and connect.
            </p>
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
              <Link className="btn" href="/fund">Get some ATOM →</Link>
              <Link className="btn secondary" href="/stake">Stake</Link>
            </>
          )}
          <Link className="btn secondary" href="/leaderboard">Leaderboard</Link>
        </div>
      </div>
    </main>
  );
}

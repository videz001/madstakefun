"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

type Me = {
  evmAddress: string;
  cosmosAddress?: string;
  xUsername?: string;
} | null;

export default function Home() {
  const [me, setMe] = useState<Me>(null);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setMe(data.user);
  }
  useEffect(() => {
    refresh();
  }, []);

  const steps = [
    { n: "01", label: "Wallet", on: !!me?.evmAddress, val: me?.evmAddress ? "connected" : "—" },
    { n: "02", label: "Cosmos profile", on: !!me?.cosmosAddress, val: me?.cosmosAddress ? "ready" : "not set" },
    { n: "03", label: "X linked", on: !!me?.xUsername, val: me?.xUsername ? `@${me.xUsername}` : "not yet" },
  ];

  return (
    <main>
      <div className="eyebrow">Easy onboard · Cosmos Hub</div>
      <h1>
        One click from EVM into <span className="accent">Cosmos</span>
      </h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        No seed phrase. No private keys collected. Connect MetaMask or Rabby, add a
        Cosmos wallet (Keplr or Leap), swap any EVM asset into ATOM, stake, and climb
        the public leaderboard.
      </p>

      <div className="card lit">
        <span className="stepnum">00</span>
        <h2>Enter the lab</h2>
        <ConnectButton onAuthed={refresh} />
      </div>

      {steps.map((s) => (
        <div className={`card${s.on ? " lit" : ""}`} key={s.n}>
          <span className="stepnum">{s.n}</span>
          <div className="spread">
            <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 13, fontWeight: 700 }}>
              {s.label}
            </span>
            <span className={`pill${s.on ? " on" : ""}`}>{s.val}</span>
          </div>
        </div>
      ))}

      {me?.evmAddress && (
        <Link className="btn" href="/profile" style={{ marginTop: 10 }}>
          Go to profile →
        </Link>
      )}
    </main>
  );
}

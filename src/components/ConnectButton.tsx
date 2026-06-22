"use client";

import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState } from "react";

// Connect MetaMask/Rabby (injected), then sign a server nonce to open a session.
export function ConnectButton({ onAuthed }: { onAuthed?: () => void }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    if (!address) return;
    setBusy(true);
    setErr(null);
    try {
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evmAddress: address }),
      });
      const { message } = await nonceRes.json();
      const signature = await signMessageAsync({ message });
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evmAddress: address, signature }),
      });
      if (!verifyRes.ok) throw new Error("verification failed");
      onAuthed?.();
    } catch (e: any) {
      setErr(e?.message || "sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) {
    return (
      <button className="btn" onClick={() => connect({ connector: injected() })}>
        Connect MetaMask / Rabby
      </button>
    );
  }

  return (
    <div>
      <div className="spread">
        <span className="mono">{address}</span>
        <button className="btn secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={signIn} disabled={busy}>
          {busy ? "Signing…" : "Sign in"}
        </button>
      </div>
      {err && <p className="muted" style={{ color: "#ff7676" }}>{err}</p>}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { VALIDATORS } from "@/lib/validators";
import { getValidators, type ValidatorInfo } from "@/lib/cosmos";
import { delegate } from "@/lib/stake";
import type { CosmosProvider } from "@/lib/cosmosWallet";

// Curated set used as a fallback if the live validator query fails.
const FALLBACK: ValidatorInfo[] = VALIDATORS.map((v) => ({
  name: v.name,
  operator: v.operator,
  commission: 0,
  votingPower: 0,
}));

export function StakeWidget({ onStaked }: { onStaked?: () => void }) {
  const [validators, setValidators] = useState<ValidatorInfo[]>(FALLBACK);
  const [validator, setValidator] = useState(FALLBACK[0].operator);
  const [filter, setFilter] = useState("");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load the full active validator set (sorted by voting power).
  useEffect(() => {
    getValidators()
      .then((list) => {
        if (list.length) {
          setValidators(list);
          setValidator(list[0].operator);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return validators;
    return validators.filter((v) => v.name.toLowerCase().includes(q));
  }, [filter, validators]);

  async function stake() {
    setBusy(true);
    setErr(null);
    setTx(null);
    try {
      const provider =
        (localStorage.getItem("cfp_cosmos_provider") as CosmosProvider) || "keplr";
      const { txHash } = await delegate(validator, Number(amount), provider);
      setTx(txHash);
      // Record the stake so it counts toward the weekly leaderboard.
      try {
        await fetch("/api/stake/record", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ validatorAddress: validator, amount: Number(amount), txHash }),
        });
      } catch {
        /* non-fatal: the delegation still succeeded on-chain */
      }
      onStaked?.();
    } catch (e: any) {
      setErr(e?.message || "delegation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="spread" style={{ margin: 0 }}>
        <label>Validator</label>
        <span className="muted" style={{ fontSize: 11 }}>
          {validators.length} active · sorted by voting power
        </span>
      </div>

      <input
        placeholder="Search validators…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginTop: 6 }}
      />
      <select
        value={validator}
        onChange={(e) => setValidator(e.target.value)}
        size={8}
        style={{ marginTop: 8, height: "auto" }}
      >
        {filtered.map((v) => (
          <option key={v.operator} value={v.operator}>
            {v.name}
            {v.votingPower ? ` · ${Math.round(v.votingPower).toLocaleString()} ATOM` : ""}
            {v.commission ? ` · ${(v.commission * 100).toFixed(1)}% comm` : ""}
          </option>
        ))}
      </select>

      <div style={{ height: 12 }} />
      <label>Amount (ATOM)</label>
      <input
        type="number" min="0" step="0.1" value={amount}
        onChange={(e) => setAmount(e.target.value)} style={{ marginTop: 6 }}
      />

      <div style={{ height: 16 }} />
      <button className="btn" onClick={stake} disabled={busy || !(Number(amount) > 0)}>
        {busy ? "Signing in wallet…" : "Stake now"}
      </button>

      {tx && (
        <p className="muted" style={{ marginTop: 12 }}>
          Delegated. Tx:{" "}
          <a className="mono" style={{ color: "var(--acid)" }}
            href={`https://www.mintscan.io/cosmos/tx/${tx}`} target="_blank" rel="noreferrer">
            {tx.slice(0, 14)}…
          </a>
        </p>
      )}
      {err && <p style={{ color: "var(--danger)", marginTop: 12 }}>{err}</p>}
    </div>
  );
}

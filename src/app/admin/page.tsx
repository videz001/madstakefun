"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  evmAddress: string;
  cosmosAddress: string | null;
  xUsername: string | null;
  createdAt: string;
  weeklyAtom: number;
  totalAtom: number;
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cfp_admin_key");
    if (saved) setKey(saved);
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(res.status === 401 ? "Wrong admin key" : "Failed to load");
      const data = await res.json();
      setUsers(data.users);
      localStorage.setItem("cfp_admin_key", key);
    } catch (e: any) {
      setErr(e?.message || "error");
      setUsers(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="eyebrow">Behind the scenes</div>
      <h1>Admin</h1>

      <div className="card">
        <label>Admin key</label>
        <div className="row" style={{ marginTop: 6 }}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ADMIN_KEY from .env"
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={load} disabled={!key || loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      </div>

      {users && (
        <>
          <div className="card spread">
            <span>{users.length} users · {users.filter((u) => u.weeklyAtom > 0).length} staked this week</span>
            <a className="btn" href={`/api/admin/export?key=${encodeURIComponent(key)}`} download>
              Export leaderboard CSV
            </a>
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>X</th>
                  <th>EVM address</th>
                  <th>Cosmos address</th>
                  <th style={{ textAlign: "right" }}>Week</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.xUsername ? `@${u.xUsername}` : "—"}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{u.evmAddress}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{u.cosmosAddress || "—"}</td>
                    <td style={{ textAlign: "right" }}>{u.weeklyAtom.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }} className="muted">{u.totalAtom.toFixed(2)}</td>
                    <td className="muted" style={{ fontSize: 11 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

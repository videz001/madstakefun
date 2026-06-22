import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { buildLeaderboard } from "@/lib/leaderboard";

export const runtime = "nodejs";

// Custom card background: drop an image at public/cosmos-bg.(jpg|png).
// If absent, the card falls back to the drawn atom motif.
async function loadBgDataUri(): Promise<string> {
  const candidates = [
    ["cosmos-bg.jpg", "image/jpeg"],
    ["cosmos-bg.jpeg", "image/jpeg"],
    ["cosmos-bg.png", "image/png"],
  ];
  for (const [name, mime] of candidates) {
    try {
      const buf = await readFile(join(process.cwd(), "public", name));
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return "";
}

// Shareable ranking card (1200x630) for social promotion.
// Uses the WEEKLY leaderboard so it matches what users see.
// GET /api/card?address=cosmos1...   (&download=1 to force download)
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const download = req.nextUrl.searchParams.get("download");
  if (!address) return new Response("address required", { status: 400 });

  const rows = await buildLeaderboard();
  const me = rows.find((r) => r.cosmosAddress === address) || null;

  const rank = me?.rank ?? null;
  const atom = me?.periodAtom ?? 0;
  const atomStr = atom.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const handle = me?.xUsername
    ? `@${me.xUsername}`
    : `${address.slice(0, 10)}…${address.slice(-4)}`;
  const avatar = me?.xAvatarUrl;
  const initial = (me?.xUsername?.[0] || address[7] || "?").toUpperCase();

  const acid = "#b6ff3a";
  const bg = await loadBgDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07080b",
          color: "#e9edf2",
          padding: 60,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background: uploaded image (with dark overlay for legibility), or
            the drawn atom motif if no image is present. */}
        {bg ? (
          <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bg} width={1200} height={630} style={{ width: 1200, height: 630, objectFit: "cover" }} alt="" />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 1200,
                height: 630,
                background: "linear-gradient(90deg, rgba(7,8,11,0.88) 0%, rgba(7,8,11,0.62) 50%, rgba(7,8,11,0.45) 100%)",
              }}
            />
          </div>
        ) : (
          <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex" }}>
            {[0, 60, 120].map((deg) => (
              <div
                key={deg}
                style={{
                  position: "absolute",
                  left: 880,
                  top: 300,
                  width: 620,
                  height: 240,
                  marginLeft: -310,
                  marginTop: -120,
                  border: "2px solid rgba(182,255,58,0.16)",
                  borderRadius: 9999,
                  transform: `rotate(${deg}deg)`,
                }}
              />
            ))}
            <div style={{ position: "absolute", left: 880, top: 300, width: 30, height: 30, marginLeft: -15, marginTop: -15, background: acid, borderRadius: 9999 }} />
            {[
              [170, 120], [1050, 120], [120, 520], [1080, 500], [620, 90], [980, 560],
            ].map(([x, y], i) => (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: 7, height: 7, background: "rgba(255,255,255,0.45)", borderRadius: 9999 }} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: acid, marginRight: 16 }} />
          <div style={{ fontSize: 28, letterSpacing: 4, color: acid, fontWeight: 700 }}>
            COSMOS LAB
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", flex: 1, marginTop: 40 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              width={220}
              height={220}
              style={{ borderRadius: 9999, border: `5px solid ${acid}` }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 9999,
                background: "#11151d",
                border: `5px solid ${acid}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 96,
                color: acid,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 50 }}>
            <div style={{ fontSize: 48, fontWeight: 700 }}>{handle}</div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 18 }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: acid, lineHeight: 1 }}>
                {atomStr}
              </div>
              <div style={{ fontSize: 38, marginLeft: 16, color: "#9aa3b2", paddingBottom: 8 }}>
                ATOM staked this week
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: acid,
              color: "#07080b",
              padding: "14px 30px",
              borderRadius: 16,
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            {rank ? `RANK #${rank}` : "UNRANKED"}
          </div>
          <div style={{ fontSize: 26, color: "#9aa3b2" }}>
            Everything is an experiment
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: download
        ? { "Content-Disposition": `attachment; filename="cosmos-fast-pass-rank.png"` }
        : undefined,
    }
  );
}

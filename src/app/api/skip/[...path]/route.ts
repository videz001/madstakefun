import { NextRequest } from "next/server";

// Server-side proxy for the Skip:Go API. The browser calls our same-origin
// /api/skip/* and we forward to Skip's keyless endpoint — server-to-server
// requests aren't subject to CORS, which is what blocked the widget when it
// called go.skip.build directly from the browser.
const BASE = "https://go.skip.build/api/skip";

async function proxy(req: NextRequest, path: string[]) {
  const url = `${BASE}/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "content-type": req.headers.get("content-type") || "application/json",
  };
  // Optional Skip API key for higher rate limits (set SKIP_API_KEY in env).
  if (process.env.SKIP_API_KEY) headers["authorization"] = process.env.SKIP_API_KEY;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();

  const res = await fetch(url, init);
  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path || []);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path || []);
}

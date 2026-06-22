import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession } from "@/lib/session";
import { store } from "@/lib/store";
import { exchangeCode, fetchXProfile } from "@/lib/x";

function back(path: string) {
  const base = process.env.X_REDIRECT_URI?.replace(/\/api\/.*$/, "") || "http://localhost:3000";
  return NextResponse.redirect(new URL(path, base));
}

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return back("/?error=not_signed_in");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = cookies();
  const expectedState = jar.get("x_oauth_state")?.value;
  const verifier = jar.get("x_pkce_verifier")?.value;
  jar.delete("x_oauth_state");
  jar.delete("x_pkce_verifier");

  if (!code || !state || state !== expectedState || !verifier) {
    return back("/profile?error=x_state_mismatch");
  }

  try {
    const tokens = await exchangeCode(code, verifier);
    const profile = await fetchXProfile(tokens.access_token);
    // Skeleton: we persist public profile only, not the tokens. To retain tokens,
    // encrypt and store them on the user (see x_accounts schema in the spec).
    await store.setXProfile(session.evmAddress, profile);
    return back("/profile?x=linked");
  } catch (e) {
    console.error(e);
    return back("/profile?error=x_exchange_failed");
  }
}

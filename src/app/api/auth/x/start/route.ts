import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession } from "@/lib/session";
import { buildAuthorizeUrl, generatePkce, randomState } from "@/lib/x";

// Kicks off X OAuth. Must be signed in (we attach X to the current user).
export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.redirect(new URL("/", process.env.X_REDIRECT_URI || "http://localhost:3000"));
  }

  const { verifier, challenge } = generatePkce();
  const state = randomState();

  const jar = cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  jar.set("x_pkce_verifier", verifier, opts);
  jar.set("x_oauth_state", state, opts);

  return NextResponse.redirect(buildAuthorizeUrl(challenge, state));
}

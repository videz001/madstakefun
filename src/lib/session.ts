import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "cfp_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set (see .env.example)");
  return new TextEncoder().encode(s);
}

export type SessionPayload = { evmAddress: string };

export async function issueSession(evmAddress: string) {
  const token = await new SignJWT({ evmAddress: evmAddress.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { evmAddress: String(payload.evmAddress) };
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE);
}

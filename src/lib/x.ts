// X (Twitter) OAuth 2.0 Authorization Code flow with PKCE.
// Confidential client: uses HTTP Basic auth (client_id:client_secret) on the
// token endpoint. Requires a PAID X developer app as of 2026.
//
// Docs: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code

import crypto from "crypto";

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const ME_URL =
  "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";

export const X_SCOPES = "tweet.read users.read offline.access";

export function generatePkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function randomState() {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthorizeUrl(challenge: string, state: string) {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("X_CLIENT_ID / X_REDIRECT_URI not set (see .env.example)");
  }
  const p = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: X_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

export async function exchangeCode(code: string, verifier: string) {
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;
  const redirectUri = process.env.X_REDIRECT_URI!;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: clientId,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

export async function fetchXProfile(accessToken: string) {
  const res = await fetch(ME_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`users/me failed: ${res.status} ${await res.text()}`);
  }
  const { data } = (await res.json()) as {
    data: { id: string; name: string; username: string; profile_image_url?: string };
  };
  return {
    xUserId: data.id,
    xUsername: data.username,
    // X returns a _normal sized avatar by default; _400x400 is the large one.
    xAvatarUrl: data.profile_image_url?.replace("_normal", "_400x400"),
  };
}

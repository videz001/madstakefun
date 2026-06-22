import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { store } from "@/lib/store";
import { issueSession } from "@/lib/session";

// POST { evmAddress, signature } -> verifies the signed nonce, opens a session.
export async function POST(req: NextRequest) {
  const { evmAddress, signature } = await req.json();
  if (!evmAddress || !signature) {
    return NextResponse.json(
      { error: "evmAddress and signature required" },
      { status: 400 }
    );
  }

  const nonce = await store.getNonce(evmAddress);
  if (!nonce) {
    return NextResponse.json({ error: "no nonce; request one first" }, { status: 400 });
  }

  const message = `Sign in to Cosmos Fast Pass\n\nAddress: ${evmAddress}\nNonce: ${nonce}`;

  let valid = false;
  try {
    valid = await verifyMessage({
      address: evmAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  await store.clearNonce(evmAddress);
  const user = await store.upsertUser(evmAddress);
  await issueSession(evmAddress);

  return NextResponse.json({ ok: true, user });
}

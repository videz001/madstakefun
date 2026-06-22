import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

// POST { evmAddress } -> { message } to be personal_sign'd by the wallet.
export async function POST(req: NextRequest) {
  const { evmAddress } = await req.json();
  if (!evmAddress || typeof evmAddress !== "string") {
    return NextResponse.json({ error: "evmAddress required" }, { status: 400 });
  }
  const nonce = Math.random().toString(36).slice(2);
  await store.setNonce(evmAddress, nonce);
  const message = `Sign in to Cosmos Fast Pass\n\nAddress: ${evmAddress}\nNonce: ${nonce}`;
  return NextResponse.json({ message });
}

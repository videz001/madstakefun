import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { store } from "@/lib/store";

// POST { cosmosAddress } -> saves the Snap-derived cosmos1... address on the user.
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cosmosAddress } = await req.json();
  if (!cosmosAddress || !String(cosmosAddress).startsWith("cosmos1")) {
    return NextResponse.json({ error: "valid cosmosAddress required" }, { status: 400 });
  }

  const user = await store.setCosmosAddress(session.evmAddress, cosmosAddress);
  return NextResponse.json({ ok: true, user });
}

// DELETE -> disconnect the Cosmos wallet (clears the saved address).
export async function DELETE() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await store.clearCosmosAddress(session.evmAddress);
  return NextResponse.json({ ok: true, user });
}

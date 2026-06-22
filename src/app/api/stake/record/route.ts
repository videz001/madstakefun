import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { store } from "@/lib/store";
import { verifyDelegation } from "@/lib/cosmos";

// POST { txHash } — record a delegation made through the app for the weekly
// leaderboard. The tx is VERIFIED on-chain: it must be a successful MsgDelegate
// from this user's Cosmos address, and the amount counted is the on-chain amount
// (the client's reported number is ignored). Each txHash counts at most once.
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await store.getUser(session.evmAddress);
  if (!user?.cosmosAddress) {
    return NextResponse.json({ error: "no cosmos profile" }, { status: 400 });
  }

  const { txHash } = await req.json();
  if (!txHash || typeof txHash !== "string") {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  // Idempotent: same tx can't be counted twice.
  if (await store.stakeEventExists(txHash)) {
    return NextResponse.json({ ok: true, alreadyRecorded: true });
  }

  // Verify on-chain that this is a real delegation from THIS user.
  const verified = await verifyDelegation(txHash, user.cosmosAddress);
  if (!verified) {
    return NextResponse.json(
      { error: "tx not verified as a delegation from your address" },
      { status: 422 }
    );
  }

  await store.recordStakeEvent(user.id, {
    cosmosAddress: user.cosmosAddress,
    validatorAddress: verified.validatorAddress,
    amount: verified.amount, // on-chain amount, not client-reported
    txHash,
  });

  return NextResponse.json({ ok: true, amount: verified.amount });
}

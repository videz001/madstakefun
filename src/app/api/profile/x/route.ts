import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { store } from "@/lib/store";

// DELETE -> disconnect X (clears handle/avatar/id from the user).
export async function DELETE() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await store.clearXProfile(session.evmAddress);
  return NextResponse.json({ ok: true, user });
}

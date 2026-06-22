import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { store } from "@/lib/store";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ user: null });
  const user = (await store.getUser(session.evmAddress)) || null;
  return NextResponse.json({ user });
}

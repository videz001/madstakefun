"use client";

// Unified way to get a signable Cosmos Hub account, from any of:
//   - "snap"  : MetaMask + Leap Cosmos Snap (EVM-only story; subject to MetaMask's
//               snap allowlist — may need MetaMask Flask if the published snap
//               version isn't allowlisted yet)
//   - "keplr" : Keplr browser extension (most reliable)
//   - "leap"  : Leap browser extension
//
// All three yield a real coin-type-118 cosmos1... address and an OfflineSigner
// that CosmJS can use to sign MsgDelegate.

import {
  connectSnap,
  getKey as snapGetKey,
  getSnap,
  CosmjsOfflineSigner,
} from "@leapwallet/cosmos-snap-provider";

export type CosmosProvider = "snap" | "keplr" | "leap";

const CHAIN_ID = process.env.NEXT_PUBLIC_COSMOS_CHAIN_ID || "cosmoshub-4";

// ---- Keplr / Leap (window-injected Cosmos wallets) ----
function injected(provider: "keplr" | "leap") {
  const w = provider === "leap" ? (window as any).leap : (window as any).keplr;
  if (!w) {
    throw new Error(
      `${provider === "leap" ? "Leap" : "Keplr"} extension not found — install it, then retry.`
    );
  }
  return w;
}

async function enableInjected(provider: "keplr" | "leap") {
  const w = injected(provider);
  await w.enable(CHAIN_ID); // cosmoshub-4 is built in; no suggestChain needed
  return w;
}

// ---- Public API ----
export async function getCosmosAddress(provider: CosmosProvider): Promise<string> {
  if (provider === "snap") {
    if (!(await getSnap())) await connectSnap(); // installs the Leap Cosmos Snap
    const key = await snapGetKey(CHAIN_ID);
    return key.address;
  }
  const w = await enableInjected(provider);
  const key = await w.getKey(CHAIN_ID);
  return key.bech32Address;
}

// Returns an OfflineSigner suitable for SigningStargateClient.connectWithSigner.
export async function getOfflineSigner(provider: CosmosProvider): Promise<any> {
  if (provider === "snap") return new CosmjsOfflineSigner(CHAIN_ID);
  const w = await enableInjected(provider);
  return w.getOfflineSigner(CHAIN_ID);
}

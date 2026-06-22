"use client";

// Stake ATOM by signing a MsgDelegate through the Leap MetaMask Snap.
// CosmjsOfflineSigner (from the snap provider) is an OfflineDirectSigner, so we
// can hand it straight to CosmJS's SigningStargateClient and use its
// delegateTokens helper — no manual proto/MsgDelegate assembly required.
//
// Verify against the installed @leapwallet/cosmos-snap-provider version:
// the class is exported as `CosmjsOfflineSigner`.

import { SigningStargateClient, GasPrice } from "@cosmjs/stargate";
import { getOfflineSigner, type CosmosProvider } from "@/lib/cosmosWallet";

const RPC =
  process.env.NEXT_PUBLIC_COSMOS_RPC_URL || "https://cosmos-rpc.publicnode.com";

const UATOM = 1_000_000;

export async function delegate(
  validatorAddress: string,
  atomAmount: number,
  provider: CosmosProvider
) {
  if (!(atomAmount > 0)) throw new Error("amount must be > 0");

  const signer = await getOfflineSigner(provider);
  const accounts = await signer.getAccounts();
  const delegator = accounts[0]?.address;
  if (!delegator) throw new Error("no Cosmos account from wallet");

  const client = await SigningStargateClient.connectWithSigner(RPC, signer, {
    gasPrice: GasPrice.fromString("0.025uatom"),
  });

  const amount = {
    denom: "uatom",
    amount: Math.round(atomAmount * UATOM).toString(),
  };

  // "auto" simulates gas; requires the account to exist on-chain (i.e. funded).
  const res = await client.delegateTokens(
    delegator,
    validatorAddress,
    amount,
    "auto",
    "Cosmos Fast Pass"
  );

  client.disconnect();
  return { txHash: res.transactionHash, delegator };
}

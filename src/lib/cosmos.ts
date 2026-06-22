// Cosmos Hub LCD/REST queries. No node required — uses a public REST endpoint.

const LCD = process.env.COSMOS_LCD_URL || "https://cosmos-rest.publicnode.com";
const UATOM = 1_000_000; // 1 ATOM = 1e6 uatom

type DelegationResponse = {
  delegation_responses?: {
    balance?: { denom: string; amount: string };
  }[];
};

// Total ATOM currently delegated by an address (sum across validators).
export async function getDelegatedAtom(cosmosAddress: string): Promise<number> {
  const url = `${LCD}/cosmos/staking/v1beta1/delegations/${cosmosAddress}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return 0;
  const data = (await res.json()) as DelegationResponse;
  const uatom = (data.delegation_responses || []).reduce((sum, d) => {
    if (d.balance?.denom === "uatom") return sum + Number(d.balance.amount);
    return sum;
  }, 0);
  return uatom / UATOM;
}

// Verify a delegation tx on-chain: confirms it succeeded, is a MsgDelegate from
// the expected delegator, and returns the ACTUAL delegated ATOM amount.
// Returns null if the tx isn't found, failed, or doesn't match — so only real
// stakes made by this user count toward the leaderboard.
export async function verifyDelegation(
  txHash: string,
  delegator: string
): Promise<{ amount: number; validatorAddress: string } | null> {
  const url = `${LCD}/cosmos/tx/v1beta1/txs/${txHash}`;
  // The tx may not be indexed by the LCD the instant it's broadcast — retry a few times.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.tx_response?.code !== 0) return null; // tx failed on-chain
      const msgs: any[] = data?.tx?.body?.messages || [];
      let uatom = 0;
      let validatorAddress = "";
      for (const m of msgs) {
        if (
          m["@type"] === "/cosmos.staking.v1beta1.MsgDelegate" &&
          m.delegator_address === delegator &&
          m.amount?.denom === "uatom"
        ) {
          uatom += Number(m.amount.amount || 0);
          validatorAddress = m.validator_address || validatorAddress;
        }
      }
      return uatom > 0 ? { amount: uatom / UATOM, validatorAddress } : null;
    }
    if (res.status === 404 || res.status === 400) {
      await new Promise((r) => setTimeout(r, 1500)); // not indexed yet — wait
      continue;
    }
    return null;
  }
  return null;
}

export type ValidatorInfo = {
  name: string;
  operator: string;
  commission: number; // 0..1
  votingPower: number; // ATOM bonded
};

// All active (bonded) Cosmos Hub validators, sorted by voting power desc —
// the same set explorers like cosmos.explorers.guru display.
export async function getValidators(): Promise<ValidatorInfo[]> {
  const url = `${LCD}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=500`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    validators?: {
      operator_address: string;
      description?: { moniker?: string };
      tokens?: string;
      jailed?: boolean;
      commission?: { commission_rates?: { rate?: string } };
    }[];
  };
  return (data.validators || [])
    .filter((v) => !v.jailed)
    .map((v) => ({
      name: v.description?.moniker || v.operator_address,
      operator: v.operator_address,
      commission: Number(v.commission?.commission_rates?.rate || 0),
      votingPower: Number(v.tokens || 0) / UATOM,
    }))
    .sort((a, b) => b.votingPower - a.votingPower);
}

// Liquid (spendable) ATOM balance — used for the "funded" check.
export async function getAtomBalance(cosmosAddress: string): Promise<number> {
  const url = `${LCD}/cosmos/bank/v1beta1/balances/${cosmosAddress}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return 0;
  const data = (await res.json()) as {
    balances?: { denom: string; amount: string }[];
  };
  const atom = (data.balances || []).find((b) => b.denom === "uatom");
  return atom ? Number(atom.amount) / UATOM : 0;
}

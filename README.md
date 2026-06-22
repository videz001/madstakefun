# Mad Stake Fun

Connect any EVM wallet eg: MetaMask/Rabby → sign in → get a Keplr wallet
obtain the Cosmos Hub address → get some ATOM → stake → leaderboard.


## Run

```bash
cp .env.example .env        # set DATABASE_URL + SESSION_SECRET (openssl rand -hex 32)
npm install                 # also runs `prisma generate` (postinstall)
npm run db:push             # create the tables in your Postgres
npm run dev                 # http://localhost:3000
```

Needs a Postgres database (local, or hosted: Supabase/Neon/Railway) and MetaMask
(the Leap Cosmos Snap installs on first use) or Rabby.

## What works now

- **Connect + sign-in** — injected wallet (MetaMask/Rabby), nonce + `personal_sign`,
  verified server-side (viem), session JWT cookie (`jose`).
- **Cosmos profile** — Profile page gets a real signable `cosmos1…` address via the
  user's choice of MetaMask Snap, **Keplr**, or **Leap** (`src/lib/cosmosWallet.ts`).
  The chosen wallet is remembered so the stake step signs with the same one.
  Note: the MetaMask Snap path depends on MetaMask's snap allowlist — if the
  published snap version isn't allowlisted, use MetaMask Flask or pick Keplr/Leap.
- **X linking** — OAuth 2.0 + PKCE (`/api/auth/x/start` → `/api/auth/x/callback`),
  stores handle/avatar/id. Needs a **paid X app** (`X_CLIENT_ID`/`X_CLIENT_SECRET`).
- **Fund** — `/fund` embeds the Skip:Go **web component** (loaded from CDN,
  `@skip-go/widget-web-component`), themed to the app palette, routing any EVM asset
  → ATOM into the user's Cosmos wallet (IBC Eureka). Live LCD balance check + a
  manual-send / open-in-new-tab fallback. (The npm `@skip-go/widget` is avoided on
  purpose — its ESM-only exports don't resolve in Next 14 and it's very heavy; the
  pre-bundled web component sidesteps both issues.)
- **Stake** — `/stake` signs `MsgDelegate` through the Snap (`CosmjsOfflineSigner` +
  CosmJS `delegateTokens`), curated validator list, broadcasts to a public Hub RPC.
- **Weekly leaderboard** — ranks users by ATOM staked through the app within the
  current Mon 00:00 → Sun 24:00 **ET** window (`StakeEvent` rows + `lib/leaderboard.ts`),
  showing lifetime on-chain total in grey. 90s cache. Resets each Monday. Every
  recorded stake is **verified on-chain** (`verifyDelegation` checks the tx is a
  successful `MsgDelegate` from the user's address and uses the on-chain amount);
  tx hashes are unique so a stake can't be double-counted.
- **Shareable rank card** — `/api/card` renders a themed PNG (X avatar/handle, weekly
  ATOM, rank) for download + tweet-intent sharing after staking.
- **Admin** — `/admin` (gated by `ADMIN_KEY`) lists every user with weekly + lifetime
  stake; `/api/admin/export` downloads the leaderboard with FULL wallet addresses as CSV.

UI uses a dark "mad science lab" theme (acid-green accent, uppercase display type,
ticker, numbered cards) inspired by the Mad Easy on Cosmos hackathon look.

Storage is **Postgres via Prisma** (`prisma/schema.prisma`, accessed through
`src/lib/db.ts` + `src/lib/store.ts`). `User` holds the EVM identity, Cosmos
address, and X profile; `Nonce` holds short-lived sign-in nonces.

## Build steps still to do

| Step | Where to hook in |
| --- | --- |
| Token retention | encrypt + store X access/refresh tokens (add fields to `User` / split `x_accounts`) |
| Refresh job | move leaderboard build into a cron/route instead of request-time cache |
| Normalize | split `wallet_accounts` / `x_accounts` if you need multiple wallets per user |

## X app setup

1. Create an app at developer.x.com (paid; no free tier as of 2026).
2. Enable OAuth 2.0, type **Web App / Confidential client**.
3. Callback URL: `http://localhost:3000/api/auth/x/callback`.
4. Scopes: `tweet.read users.read offline.access`.
5. Put the client id/secret in `.env`.

## Layout

```
src/
  app/
    page.tsx                landing / connect
    profile/page.tsx        Snap connect + cosmos address + Link X
    fund/page.tsx           Skip:Go funding widget
    stake/page.tsx          MsgDelegate via Snap
    leaderboard/page.tsx    ranked by delegated ATOM
    api/
      auth/{nonce,verify,me,logout}/route.ts
      auth/x/{start,callback}/route.ts
      profile/cosmos/route.ts
      leaderboard/route.ts
  components/{ConnectButton,SkipFundWidget,StakeWidget,Ticker}.tsx
  lib/{db,store,session,wagmi,snap,cosmos,validators,x,stake}.ts
prisma/schema.prisma        User + Nonce tables
```

## Key design note

Cosmos Hub is **not** an EVM chain — it won't accept MetaMask's `eth_secp256k1`
signatures. So the Cosmos address comes from the **Leap Snap** (coin type 118), which
also lets MetaMask sign Hub txs. The EVM wallet is used for the session identity and
as the funding source, not to derive the Cosmos key.

import type { Metadata } from "next";
import Link from "next/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.madstake.fun";

type Props = {
  params: { address: string };
  searchParams: { period?: string };
};

// X / OG unfurl: the card PNG becomes the link preview image, so when this URL
// is shared on X the ranking card appears embedded in the tweet automatically.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const period = searchParams.period === "all" ? "all" : searchParams.period === "month" ? "month" : "week";
  const address = params.address;
  const card = `${SITE}/api/card?address=${encodeURIComponent(address)}&period=${period}`;
  const title = "MAD STAKE FUN — my Cosmos Hub rank";
  const description =
    "One click from EVM into Cosmos. Swap any EVM asset into ATOM, stake, and climb the leaderboard.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/share/${encodeURIComponent(address)}?period=${period}`,
      images: [{ url: card, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [card],
    },
  };
}

export default function SharePage({ params, searchParams }: Props) {
  const period = searchParams.period === "all" ? "all" : searchParams.period === "month" ? "month" : "week";
  const card = `/api/card?address=${encodeURIComponent(params.address)}&period=${period}`;

  return (
    <main>
      <div className="eyebrow">MAD STAKE FUN</div>
      <h1>
        Cosmos Hub <span className="accent">rank</span>
      </h1>
      <div className="card lit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card}
          alt="MAD STAKE FUN rank card"
          style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
        />
        <div className="row" style={{ marginTop: 16 }}>
          <Link className="btn" href="/">Turn your EVM wallet into a Cosmos profile →</Link>
          <Link className="btn secondary" href="/leaderboard">See the leaderboard</Link>
        </div>
      </div>
    </main>
  );
}

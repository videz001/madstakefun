import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import { Ticker } from "@/components/Ticker";

export const metadata: Metadata = {
  title: "Cosmos Fast Pass",
  description: "Turn your EVM wallet into a Cosmos profile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="top">
            <Link className="brand" href="/">MAD STAKE FUN</Link>
            <Link href="/">Connect</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/fund">Get ATOM</Link>
            <Link href="/stake">Stake</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
          <Ticker />
          <div className="container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}

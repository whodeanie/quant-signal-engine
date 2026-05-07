import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://quant-signal-engine.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Quant Signal Engine",
    template: "%s | Quant Signal Engine"
  },
  description:
    "Backtest classic quant trading signals on real historical market data. Three strategies, walk forward simulation, full performance statistics, AI commentary. Educational analytics, not financial advice. No trade execution.",
  openGraph: {
    title: "Quant Signal Engine",
    description:
      "Walk forward backtests of RSI mean reversion, moving average crossover, and Bollinger band breakout strategies. Free.",
    url: SITE_URL,
    siteName: "Quant Signal Engine",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Quant Signal Engine",
    description: "Backtest trading signals on real data. Free."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

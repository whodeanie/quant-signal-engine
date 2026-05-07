import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://quant-signal-engine.vercel.app";
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/backtest`, lastModified: now },
    { url: `${SITE_URL}/strategies`, lastModified: now },
    { url: `${SITE_URL}/portfolio`, lastModified: now }
  ];
}

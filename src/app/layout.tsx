import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEOBench — 4 Frontier Models. $1,000 Each. One Trading Arena.",
  description:
    "We gave ChatGPT, Claude, Grok, and Gemini $1,000 each to manage five trading agents on DX Terminal Pro — the first onchain agentic market on Base. A live benchmark of frontier LLM performance in subagent management under real market pressure.",
  icons: { icon: "/favicon.png" },
  metadataBase: new URL("https://ceobench.terminal.markets"),
  openGraph: {
    title: "CEOBench — 4 Frontier Models. $1,000 Each. One Trading Arena.",
    description:
      "We gave ChatGPT, Claude, Grok, and Gemini $1,000 each to manage five trading agents on DX Terminal Pro. Who builds the best trading empire? Watch live.",
    url: "https://ceobench.terminal.markets",
    siteName: "CEOBench by DXRG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CEOBench — ChatGPT vs Claude vs Grok vs Gemini trading competition",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CEOBench — 4 Frontier Models. $1,000 Each. One Trading Arena.",
    description:
      "We gave ChatGPT, Claude, Grok, and Gemini $1,000 each to manage five trading agents on DX Terminal Pro. Who builds the best trading empire?",
    images: ["/og-image.png"],
    creator: "@DXRGai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

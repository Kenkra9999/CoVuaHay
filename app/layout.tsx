import type { Metadata } from "next";
/* eslint-disable @next/next/no-page-custom-font -- The shared App Router root layout loads fonts on every page. */
import "./globals.css";
import { assetUrl } from "../lib/asset-url";

export const metadata: Metadata = {
  title: "Nước Cờ — The Chess Atelier · AI & đấu cùng bạn",
  description: "Tám bộ quân độc bản, gồm Hắc Long và Thiên thần & Ác quỷ. Bàn cờ rộng với băng tuyết, dung nham chuyển động, trợ lý Stockfish và phòng đấu online có đồng hồ.",
  icons: { icon: assetUrl("/pieces/sakura/bN.svg") },
  openGraph: {
    title: "Nước Cờ — Nước đi của riêng bạn.",
    description: "Tám bộ quân độc bản · Bàn cờ băng và dung nham · Trợ lý Stockfish · Phòng đấu online.",
    type: "website",
    images: [{ url: assetUrl("/og-v3.png"), width: 1733, height: 907, alt: "Nước Cờ — Làm chủ từng nước cờ" }],
  },
  twitter: { card: "summary_large_image", images: [assetUrl("/og-v3.png")] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}

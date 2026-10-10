import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-v3.png`;
  return {
    title: "Nước Cờ — Chiến trường cờ vua & cố vấn AI",
    description: "Đấu Stockfish, nhận gợi ý có mũi tên và phân tích chiến thuật, hoặc mời bạn bè vào chiến trường cờ vua bằng mã phòng.",
    icons: { icon: "/pieces/bN.svg" },
    openGraph: {
      title: "Nước Cờ — Làm chủ chiến cuộc.",
      description: "Đấu Stockfish · Gợi ý nước đi · Phân tích chiến thuật · Chơi cùng bạn bè.",
      type: "website",
      images: [{ url: image, width: 1733, height: 907, alt: "Nước Cờ — Làm chủ từng nước cờ" }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-v3.png`;
  return {
    title: "Nước Cờ — The Chess Atelier · AI & đấu cùng bạn",
    description: "Bàn cờ thủ công, quân cờ ánh kim, trợ lý Stockfish và phòng đấu online có đồng hồ. Mời bạn bằng mã, đổi tên trực tiếp và tiếp tục ván sau khi tải lại.",
    icons: { icon: "/pieces/bN.svg" },
    openGraph: {
      title: "Nước Cờ — Nước đi của riêng bạn.",
      description: "Quân cờ ánh kim · Trợ lý Stockfish · Phòng đấu online · Đồng hồ và khôi phục ván.",
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

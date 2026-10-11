import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nước Cờ — The Chess Atelier · AI & đấu cùng bạn",
  description: "Năm bộ quân độc bản: Dung nham & Băng giá, Hoàng gia, Tinh vân, Ngọc phong và Cơ giáp. Bàn cờ rộng, trợ lý Stockfish và phòng đấu online có đồng hồ.",
  icons: { icon: "/pieces/sakura/bN.svg" },
  openGraph: {
    title: "Nước Cờ — Nước đi của riêng bạn.",
    description: "Năm bộ quân độc bản · Trợ lý Stockfish · Phòng đấu online · Đồng hồ và khôi phục ván.",
    type: "website",
    images: [{ url: "/og-v3.png", width: 1733, height: 907, alt: "Nước Cờ — Làm chủ từng nước cờ" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-v3.png"] },
};

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

import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font", display: "swap" });

export const metadata = {
  title: "Scene Finder",
  description: "Cari scene K-Drama dan K-Pop untuk bahan edit dari akun-akun kreator Instagram.",
  referrer: "no-referrer", // thumbnail Instagram dimuat tanpa referrer
};

export const viewport = { themeColor: "#A6C84B" };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}

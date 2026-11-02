import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const font = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font", display: "swap" });

export const metadata = {
  title: "Scene Finder",
  description: "Cari scene K-Drama dan K-Pop untuk bahan edit dari akun-akun kreator Instagram.",
  referrer: "no-referrer", // thumbnail Instagram dimuat tanpa referrer
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: "#E9E9E6" };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}

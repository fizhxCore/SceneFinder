import "./globals.css";
import RegisterSW from "../components/RegisterSW.jsx";

// Font dimuat lewat <link> saat halaman dibuka, bukan saat build, supaya build tidak gagal kalau Google Fonts bermasalah.
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap";

export const metadata = {
  title: "Scene Finder",
  description: "Cari scene K-Drama dan K-Pop untuk bahan edit dari akun-akun kreator Instagram.",
  referrer: "no-referrer", // thumbnail Instagram dimuat tanpa referrer
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "SceneFinder", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#E9E9E6", viewportFit: "cover" };

const THUMB_BASE = (process.env.NEXT_PUBLIC_THUMB_BASE || "").replace(/\/$/, "").replace(/(https?:\/\/[^/]+).*/, "$1");

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        {THUMB_BASE && <link rel="preconnect" href={THUMB_BASE} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_CSS} />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Scene Finder",
  description: "Cari scene K-Drama dan K-Pop untuk bahan edit dari akun-akun kreator Instagram.",
  referrer: "no-referrer", // thumbnail Instagram dimuat tanpa referrer
};

export const viewport = { themeColor: "#141414" };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

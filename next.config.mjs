/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Alamat repo gambar dipasang langsung di sini sebagai cadangan, supaya tidak bergantung pada env di Vercel.
  // Env NEXT_PUBLIC_THUMB_BASE di Vercel tetap menang kalau diisi.
  env: {
    NEXT_PUBLIC_THUMB_BASE: process.env.NEXT_PUBLIC_THUMB_BASE || "https://fizhxcore.github.io/SceneFinder-thumbs",
  },
  // Web pribadi: minta mesin pencari tidak mengindeks apa pun.
  async headers() {
    return [
      { source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Nama file thumbnail = ID post dan isinya tidak berubah, jadi aman di-cache lama.
      { source: "/thumbs/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;

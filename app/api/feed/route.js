import akun from "../../../akun.json";
import { buildFeed } from "../../../lib/feed.js";

export const dynamic = "force-dynamic"; // jangan dijalankan saat build
export const maxDuration = 30;

// Dicache di CDN Vercel 1 jam; setelah itu data lama tetap dilayani sambil diperbarui di belakang layar.
// Respons gagal total sengaja TIDAK dicache supaya cache lama yang bagus tidak tertimpa.
export async function GET() {
  const feed = await buildFeed(akun);
  const failedAll = feed.sourceCount > 0 && feed.posts.length === 0;
  return Response.json(feed, {
    status: failedAll ? 502 : 200,
    headers: {
      "Cache-Control": failedAll ? "no-store" : "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import feed from "../../../data/feed.json";

// Data ditulis worker VPS ke repo dan ikut ter-build di Vercel, jadi tidak ada scrape saat runtime.
export const dynamic = "force-static";

export function GET() {
  return Response.json(feed, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

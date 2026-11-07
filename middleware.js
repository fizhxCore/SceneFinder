import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "./lib/auth.js";

// Semua halaman, /api/feed, dan thumbnail butuh cookie masuk. Halaman login, robots.txt, dan aset Next dikecualikan.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|login|api/login|logo.png|logo-sm.png|icon.png|apple-icon.png).*)"],
};

export async function middleware(req) {
  const secret = process.env.SITE_PASSWORD;

  if (!secret) {
    // Di produksi tanpa sandi, tutup total daripada terbuka tanpa sengaja. Di lokal dibiarkan terbuka.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Situs terkunci: SITE_PASSWORD belum diisi di pengaturan Vercel.", { status: 503 });
    }
    return NextResponse.next();
  }

  if (await verifyToken(req.cookies.get(COOKIE)?.value, secret)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Butuh sandi" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

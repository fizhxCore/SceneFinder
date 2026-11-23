import { NextResponse } from "next/server";
import { safeEqual } from "../../../../lib/auth.js";
import { redis, upstashConfigured } from "../../../../lib/upstash.js";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, LOGIN_WINDOW, clientIp, hashIp, loginVerdict, makeAdminToken } from "../../../../lib/adminSession.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { ADMIN_KEY } = process.env;
  const back = (query = "") => {
    const res = NextResponse.redirect(new URL(`/admin${query}`, req.url), 303);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
  if (!ADMIN_KEY) return back("?belum=1");

  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return new NextResponse("Permintaan ditolak.", { status: 403 });

  const form = await req.formData().catch(() => null);
  const key = String(form?.get("password") ?? "");

  // Batas percobaan per alamat IP. Kalau Upstash tidak tersedia, batas dilewati supaya kamu tidak terkunci dari adminmu sendiri.
  let rlKey = null;
  if (upstashConfigured()) {
    try {
      const k = `sf:admlogin:${await hashIp(clientIp(req.headers), ADMIN_KEY)}`;
      const n = await redis(["INCR", k]);
      if (n === 1) await redis(["EXPIRE", k, LOGIN_WINDOW]);
      rlKey = k;
      if (!loginVerdict(n).ok) return back("?terkunci=1");
    } catch {
      rlKey = null;
    }
  }

  if (!safeEqual(key, ADMIN_KEY)) {
    await new Promise((r) => setTimeout(r, 700)); // memperlambat tebak-tebakan kunci
    return back("?salah=1");
  }

  if (rlKey) await redis(["DEL", rlKey]).catch(() => {});
  const res = back();
  res.cookies.set(ADMIN_COOKIE, await makeAdminToken(ADMIN_KEY), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}

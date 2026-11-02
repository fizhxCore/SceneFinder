import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, makeToken, safeEqual } from "../../../lib/auth.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const secret = process.env.SITE_PASSWORD;
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");
  const redirect = (path) => NextResponse.redirect(new URL(path, req.url), 303);

  if (!secret || !safeEqual(password, secret)) {
    await new Promise((r) => setTimeout(r, 700)); // memperlambat tebak-tebakan sandi
    return redirect("/login?salah=1");
  }

  const res = redirect("/");
  res.cookies.set(COOKIE, await makeToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../../../../lib/adminSession.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

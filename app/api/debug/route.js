import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Sementara, untuk membandingkan dua alamat: tidak berisi rahasia. Hapus file ini setelah masalahnya ketemu.
export function GET(req) {
  const e = process.env;
  return NextResponse.json({
    host: req.headers.get("host"),
    thumbBase: e.NEXT_PUBLIC_THUMB_BASE || null,
    vercelEnv: e.VERCEL_ENV || null,
    commit: (e.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || null,
    deployment: e.VERCEL_URL || null,
  });
}

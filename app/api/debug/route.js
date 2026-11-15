import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Sementara, untuk membandingkan dua alamat: tidak berisi rahasia. Hapus file ini setelah masalahnya ketemu.
export function GET(req) {
  const e = process.env;
  return NextResponse.json({
    host: req.headers.get("host"),
    // Dibaca seperti kode halaman (Next mengganti tulisan ini dengan nilainya saat build):
    thumbBaseSaatBuild: process.env.NEXT_PUBLIC_THUMB_BASE || null,
    // Dibaca lewat objek env saat server berjalan:
    thumbBaseSaatJalan: e["NEXT_PUBLIC_THUMB_BASE"] || null,
    vercelEnv: e.VERCEL_ENV || null,
    commit: (e.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || null,
    deployment: e.VERCEL_URL || null,
  });
}

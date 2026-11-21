import { NextResponse } from "next/server";
import { safeEqual } from "../../../../lib/auth.js";
import { redis, upstashConfigured } from "../../../../lib/upstash.js";
import { isStatus, parseStored, publicView } from "../../../../lib/requests.js";

export const dynamic = "force-dynamic";

const HASH = "sf:req";
const fail = (error, status) => NextResponse.json({ error }, { status });

// Satu rute untuk admin: { key, action: "list" | "status" | "delete", id, status }.
export async function POST(req) {
  const { ADMIN_KEY } = process.env;
  if (!ADMIN_KEY || !upstashConfigured()) return fail("Fitur ini belum diatur di server (ADMIN_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).", 503);

  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Permintaan ditolak.", 403);

  const body = await req.json().catch(() => ({}));
  if (!safeEqual(String(body.key ?? ""), ADMIN_KEY)) {
    await new Promise((r) => setTimeout(r, 700)); // memperlambat tebak-tebakan kunci
    return fail("Kunci admin salah.", 401);
  }

  try {
    if (body.action === "list") {
      const requests = parseStored(await redis(["HGETALL", HASH])).map(publicView);
      return NextResponse.json({ requests });
    }
    const id = String(body.id ?? "");
    if (!/^[a-z0-9]{6,24}$/.test(id)) return fail("Id request tidak valid.", 400);
    if (body.action === "delete") {
      await redis(["HDEL", HASH, id]);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "status") {
      if (!isStatus(body.status)) return fail("Status tidak dikenal.", 400);
      const raw = await redis(["HGET", HASH, id]);
      if (!raw) return fail("Request tidak ditemukan.", 404);
      const r = { ...JSON.parse(raw), status: body.status };
      await redis(["HSET", HASH, id, JSON.stringify(r)]);
      return NextResponse.json({ ok: true });
    }
    return fail("Aksi tidak dikenal.", 400);
  } catch {
    return fail("Tidak bisa menghubungi penyimpanan.", 502);
  }
}

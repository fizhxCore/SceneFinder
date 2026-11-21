import { NextResponse } from "next/server";
import { redis, redisPipeline, upstashConfigured } from "../../../lib/upstash.js";
import { LIMITS, dayKey, makeRequest, parseStored, publicView, rateVerdict, validClientId, validateRequest } from "../../../lib/requests.js";

export const dynamic = "force-dynamic";

const HASH = "sf:req";
const fail = (error, status) => NextResponse.json({ error }, { status });

// Request milik satu perangkat (dikenali lewat id acak di browser) beserta sisa jatah hari ini.
export async function GET(req) {
  if (!upstashConfigured()) return fail("Fitur request belum diatur di server.", 503);
  const client = new URL(req.url).searchParams.get("client");
  if (!validClientId(client)) return fail("Sesi tidak dikenali.", 400);
  try {
    const [flat, used] = await Promise.all([redis(["HGETALL", HASH]), redis(["GET", `sf:rl:${dayKey()}:${client}`])]);
    const requests = parseStored(flat).filter((r) => r.client === client).map(publicView);
    return NextResponse.json({ requests, left: Math.max(0, LIMITS.perClient - (Number(used) || 0)) });
  } catch {
    return fail("Tidak bisa menghubungi penyimpanan.", 502);
  }
}

export async function POST(req) {
  if (!upstashConfigured()) return fail("Fitur request belum diatur di server.", 503);
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Permintaan ditolak.", 403);

  const v = validateRequest(await req.json().catch(() => ({})));
  if (!v.ok) return fail(v.error, 400);

  try {
    const day = dayKey();
    const ck = `sf:rl:${day}:${v.client}`;
    const gk = `sf:rlg:${day}`;
    const [client, , global] = await redisPipeline([["INCR", ck], ["EXPIRE", ck, 172800], ["INCR", gk], ["EXPIRE", gk, 172800]]);
    const verdict = rateVerdict({ client, global });
    if (!verdict.ok) return fail(verdict.error, 429);

    if ((await redis(["HLEN", HASH])) >= LIMITS.stored) return fail("Daftar request sedang penuh. Hubungi owner.", 503);
    const r = makeRequest(v);
    await redis(["HSET", HASH, r.id, JSON.stringify(r)]);
    return NextResponse.json({ ok: true, request: publicView(r), left: verdict.left });
  } catch {
    return fail("Tidak bisa menghubungi penyimpanan.", 502);
  }
}

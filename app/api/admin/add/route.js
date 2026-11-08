import { NextResponse } from "next/server";
import { safeEqual } from "../../../../lib/auth.js";
import { parseInstagramPostUrl } from "../../../../lib/igurl.js";

export const dynamic = "force-dynamic";

const fail = (error, status) => NextResponse.json({ error }, { status });

// Menjalankan workflow scrape.yml dengan input `url`; bot yang mengambil data dan menambah scene.
export async function POST(req) {
  const { ADMIN_KEY, GH_DISPATCH_TOKEN, GITHUB_REPO } = process.env;
  if (!ADMIN_KEY || !GH_DISPATCH_TOKEN || !GITHUB_REPO) return fail("Fitur ini belum diatur di server (ADMIN_KEY, GH_DISPATCH_TOKEN, GITHUB_REPO).", 503);

  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Permintaan ditolak.", 403);

  const body = await req.json().catch(() => ({}));
  if (!safeEqual(String(body.key ?? ""), ADMIN_KEY)) {
    await new Promise((r) => setTimeout(r, 700)); // memperlambat tebak-tebakan kunci
    return fail("Kunci admin salah.", 401);
  }
  const post = parseInstagramPostUrl(body.url);
  if (!post) return fail("Itu bukan link postingan Instagram (contoh: instagram.com/p/xxxx atau /reel/xxxx).", 400);

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/scrape.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "scene-finder-admin",
    },
    body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || "main", inputs: { url: post.url } }),
  }).catch(() => null);

  if (!res) return fail("Tidak bisa menghubungi GitHub.", 502);
  if (res.status === 204) return NextResponse.json({ ok: true, url: post.url });
  if (res.status === 401 || res.status === 403) return fail("Token GitHub ditolak. Periksa GH_DISPATCH_TOKEN (izin Actions: Read and write).", 502);
  if (res.status === 404) return fail("Repo atau workflow tidak ditemukan. Periksa GITHUB_REPO.", 502);
  if (res.status === 422) return fail("Workflow belum punya input url. Pasang scrape.yml yang terbaru.", 502);
  return fail(`GitHub membalas ${res.status}.`, 502);
}

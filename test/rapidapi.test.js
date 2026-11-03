import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULTS,
  QuotaError,
  normalizeRapidItem,
  parseRapidResponse,
  fetchAccountPostsRapid,
  createRapidFetcher,
} from "../lib/rapidapi.js";

test("DEFAULTS memakai endpoint Instagram Scraper Stable API", () => {
  assert.equal(
    DEFAULTS.host,
    "instagram-scraper-stable-api.p.rapidapi.com"
  );
  assert.equal(DEFAULTS.path, "/get_ig_user_posts.php");
  assert.equal(DEFAULTS.bodyField, "username_or_url");
  assert.equal(DEFAULTS.amount, 12);
});

test("normalizeRapidItem membaca data postingan", () => {
  const result = normalizeRapidItem(
    {
      code: "ABC123",
      username: "contoh",
      caption: "Tes #kdrama",
      thumbnail_url: "https://example.com/image.jpg",
      post_type: "video",
    },
    "fallback"
  );

  assert.ok(result);
  assert.equal(result.id, "ABC123");
  assert.equal(result.username, "contoh");
  assert.equal(result.caption, "Tes #kdrama");
  assert.equal(result.kind, "video");
  assert.ok(result.url.includes("ABC123"));
  assert.deepEqual(result.hashtags, ["kdrama"]);
});

test("normalizeRapidItem membaca username cadangan", () => {
  const result = normalizeRapidItem(
    {
      code: "XYZ123",
      thumbnail_url: "https://example.com/image.jpg",
    },
    "akuncontoh"
  );

  assert.equal(result.username, "akuncontoh");
});

test("normalizeRapidItem membaca postingan carousel", () => {
  const result = normalizeRapidItem({
    code: "CAR123",
    thumbnail_url: "https://example.com/image.jpg",
    post_type: "carousel",
  });

  assert.equal(result.kind, "carousel");
});

test("normalizeRapidItem mengabaikan data tanpa thumbnail", () => {
  assert.equal(
    normalizeRapidItem({ code: "ABC123" }),
    null
  );
});

test("parseRapidResponse membaca daftar posts", () => {
  const result = parseRapidResponse(
    {
      posts: [
        {
          code: "POST123",
          thumbnail_url: "https://example.com/image.jpg",
          caption: "Drama #scene",
        },
      ],
    },
    "akuncontoh"
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "POST123");
  assert.equal(result[0].username, "akuncontoh");
});

test("parseRapidResponse membaca data.posts", () => {
  const result = parseRapidResponse(
    {
      data: {
        posts: [
          {
            code: "POST456",
            thumbnail_url: "https://example.com/image.jpg",
          },
        ],
      },
    },
    "akuncontoh"
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "POST456");
});

test("parseRapidResponse membaca posts dengan node", () => {
  const result = parseRapidResponse(
    {
      posts: [
        {
          node: {
            code: "NODE123",
            thumbnail_url: "https://example.com/image.jpg",
          },
        },
      ],
    },
    "akuncontoh"
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "NODE123");
});

test("parseRapidResponse menolak format yang tidak dikenal", () => {
  assert.throws(
    () => parseRapidResponse({ message: "Invalid response" }, "akun"),
    /Respons RapidAPI tidak dikenali/
  );
});

test("fetchAccountPostsRapid memakai POST dan Form Data", async () => {
  let capturedUrl;
  let capturedOptions;

  const fakeFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;

    return new Response(
      JSON.stringify({
        posts: [
          {
            code: "TEST123",
            thumbnail_url: "https://example.com/image.jpg",
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  };

  const result = await fetchAccountPostsRapid("contoh", {
    key: "test-key",
    fetchImpl: fakeFetch,
  });

  assert.equal(
    capturedUrl,
    `https://${DEFAULTS.host}${DEFAULTS.path}`
  );
  assert.equal(capturedOptions.method, "POST");
  assert.equal(
    capturedOptions.headers["x-rapidapi-key"],
    "test-key"
  );
  assert.equal(
    capturedOptions.headers["x-rapidapi-host"],
    DEFAULTS.host
  );

  assert.ok(capturedOptions.body instanceof FormData);
  assert.equal(
    capturedOptions.body.get("username_or_url"),
    "contoh"
  );
  assert.equal(capturedOptions.body.get("amount"), "12");
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "TEST123");
});

test("fetchAccountPostsRapid mendukung konfigurasi endpoint", async () => {
  let capturedUrl;
  let capturedBody;

  const fakeFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = options.body;

    return new Response(JSON.stringify({ posts: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await fetchAccountPostsRapid("@contoh", {
    key: "test-key",
    host: "custom-api.example",
    path: "/custom-endpoint",
    bodyField: "custom_username",
    amount: 5,
    fetchImpl: fakeFetch,
  });

  assert.equal(
    capturedUrl,
    "https://custom-api.example/custom-endpoint"
  );
  assert.equal(capturedBody.get("custom_username"), "contoh");
  assert.equal(capturedBody.get("amount"), "5");
});

test("fetchAccountPostsRapid menolak username tidak valid", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("username tidak valid", {
        key: "test-key",
      }),
    /Username tidak valid/
  );
});

test("fetchAccountPostsRapid menolak jika API key kosong", async () => {
  await assert.rejects(
    () => fetchAccountPostsRapid("contoh", {}),
    /RAPIDAPI_KEY belum diisi/
  );
});

test("fetchAccountPostsRapid menangani status 401", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("contoh", {
        key: "test-key",
        fetchImpl: async () =>
          new Response("Unauthorized", { status: 401 }),
      }),
    QuotaError
  );
});

test("fetchAccountPostsRapid menangani status 403", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("contoh", {
        key: "test-key",
        fetchImpl: async () =>
          new Response("Forbidden", { status: 403 }),
      }),
    QuotaError
  );
});

test("fetchAccountPostsRapid menangani status 429", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("contoh", {
        key: "test-key",
        fetchImpl: async () =>
          new Response("Too Many Requests", { status: 429 }),
      }),
    QuotaError
  );
});

test("fetchAccountPostsRapid menangani status 404", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("contoh", {
        key: "test-key",
        fetchImpl: async () =>
          new Response("Not Found", { status: 404 }),
      }),
    /Endpoint atau akun tidak ditemukan/
  );
});

test("fetchAccountPostsRapid menangani respons bukan JSON", async () => {
  await assert.rejects(
    () =>
      fetchAccountPostsRapid("contoh", {
        key: "test-key",
        fetchImpl: async () =>
          new Response("bukan json", { status: 200 }),
      }),
    /RapidAPI tidak membalas JSON/
  );
});

test("createRapidFetcher membaca konfigurasi environment", async () => {
  let capturedUrl;
  let capturedBody;

  const fetcher = createRapidFetcher(
    {
      RAPIDAPI_KEY: "test-key",
      RAPIDAPI_HOST: "custom-api.example",
      RAPIDAPI_PATH: "/custom",
      RAPIDAPI_BODY_FIELD: "username_or_url",
      RAPIDAPI_AMOUNT: "8",
    },
    {
      fetchImpl: async (url, options) => {
        capturedUrl = url;
        capturedBody = options.body;

        return new Response(JSON.stringify({ posts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    }
  );

  await fetcher("contoh");

  assert.equal(capturedUrl, "https://custom-api.example/custom");
  assert.equal(capturedBody.get("username_or_url"), "contoh");
  assert.equal(capturedBody.get("amount"), "8");
});

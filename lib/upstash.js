// Klien Upstash Redis lewat REST, tanpa pustaka tambahan. Perintah dikirim sebagai array: ["HSET", "kunci", "field", "nilai"].
export function upstashConfigured(env = process.env) {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

const base = (env) => String(env.UPSTASH_REDIS_REST_URL).replace(/\/+$/, "");
const headers = (env) => ({ Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" });

export async function redis(cmd, { env = process.env, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(base(env), { method: "POST", headers: headers(env), body: JSON.stringify(cmd), cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Upstash ${res.status}`);
  return data.result;
}

// Beberapa perintah sekaligus dalam satu panggilan. Hasilnya array nilai, urutannya sama dengan perintah.
export async function redisPipeline(cmds, { env = process.env, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${base(env)}/pipeline`, { method: "POST", headers: headers(env), body: JSON.stringify(cmds), cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) throw new Error(`Upstash ${res.status}`);
  return data.map((d) => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

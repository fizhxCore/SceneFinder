// Koleksi "map" favorit: disimpan di HP (localStorage). Satu scene boleh ada di beberapa map.
export const MAX_MAPS = 30;
export const MAX_NAME = 40;

const uid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const cleanName = (n) => String(n ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

export const emptyState = () => ({ maps: [] });

// Isi localStorage tidak dipercaya: bentuknya dirapikan dulu.
export function normalize(raw) {
  const list = Array.isArray(raw?.maps) ? raw.maps : [];
  const maps = list
    .filter((m) => m && typeof m.id === "string" && typeof m.name === "string" && cleanName(m.name))
    .slice(0, MAX_MAPS)
    .map((m) => ({
      id: m.id,
      name: cleanName(m.name),
      ids: [...new Set((Array.isArray(m.ids) ? m.ids : []).filter((x) => typeof x === "string"))].slice(0, 500),
      t: Number(m.t) || 0,
    }));
  return { maps };
}

// Mengembalikan state baru dan id map. Nama yang sama (tanpa membedakan huruf besar-kecil) memakai map yang sudah ada.
export function addMap(state, name, now = Date.now()) {
  const n = cleanName(name);
  if (!n) return { state, id: null };
  const dup = state.maps.find((m) => m.name.toLowerCase() === n.toLowerCase());
  if (dup) return { state, id: dup.id };
  if (state.maps.length >= MAX_MAPS) return { state, id: null };
  const map = { id: uid(), name: n, ids: [], t: now };
  return { state: { maps: [...state.maps, map] }, id: map.id };
}

// Scene terbaru ditaruh di depan; kalau sudah ada, dikeluarkan.
export function toggleScene(state, mapId, postId, now = Date.now()) {
  return {
    maps: state.maps.map((m) => {
      if (m.id !== mapId) return m;
      const has = m.ids.includes(postId);
      return { ...m, ids: has ? m.ids.filter((x) => x !== postId) : [postId, ...m.ids].slice(0, 500), t: now };
    }),
  };
}

export function renameMap(state, mapId, name) {
  const n = cleanName(name);
  if (!n) return state;
  if (state.maps.some((m) => m.id !== mapId && m.name.toLowerCase() === n.toLowerCase())) return state;
  return { maps: state.maps.map((m) => (m.id === mapId ? { ...m, name: n } : m)) };
}

export const removeMap = (state, mapId) => ({ maps: state.maps.filter((m) => m.id !== mapId) });
export const mapsOf = (state, postId) => state.maps.filter((m) => m.ids.includes(postId)).map((m) => m.id);

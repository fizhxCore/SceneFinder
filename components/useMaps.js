"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addMap, emptyState, mapsOf, normalize, removeMap, renameMap, restoreMap, toggleScene } from "../lib/maps.js";

const KEY = "sf_maps_v1";

export default function useMaps() {
  const [state, setState] = useState(emptyState);
  const ref = useRef(state);

  const apply = useCallback((next) => {
    ref.current = next;
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* penyimpanan penuh atau dimatikan: tetap jalan di memori */
    }
  }, []);

  useEffect(() => {
    try {
      const loaded = normalize(JSON.parse(localStorage.getItem(KEY) || "null"));
      ref.current = loaded;
      setState(loaded);
    } catch {
      /* data rusak: mulai dari kosong */
    }
  }, []);

  return {
    state,
    create: (name) => {
      const r = addMap(ref.current, name);
      if (r.state !== ref.current) apply(r.state);
      return r.id;
    },
    toggle: (mapId, postId) => apply(toggleScene(ref.current, mapId, postId)),
    rename: (mapId, name) => apply(renameMap(ref.current, mapId, name)),
    remove: (mapId) => apply(removeMap(ref.current, mapId)),
    restore: (map, index) => apply(restoreMap(ref.current, map, index)),
    isSaved: (postId) => state.maps.some((m) => m.ids.includes(postId)),
    mapsOf: (postId) => mapsOf(state, postId),
  };
}

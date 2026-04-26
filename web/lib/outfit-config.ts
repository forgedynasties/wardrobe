export interface MannequinSlot {
  top: number;
  height: number;
  zIndex: number;
  left?: number;
  width?: number;
}

export interface OutfitConfig {
  categoryOrder: string[];
  categoryZIndex: Record<string, number>;
  mannequinSlots: Record<string, MannequinSlot>;
  subcategorySlots: Record<string, MannequinSlot>;
  overlapSmall: number;
  overlapLarge: number;
  overlapThreshold: number;
}

const defaults: OutfitConfig = {
  categoryOrder: ["Outerwear", "Top", "Bottom", "Shoes", "Accessory"],
  categoryZIndex: {
    Bottom: 1,
    Top: 2,
    Outerwear: 3,
    Shoes: 4,
    Accessory: 5,
  },
  mannequinSlots: {
    Outerwear: { top: 0, height: 46, zIndex: 3 },
    Top:       { top: 5, height: 32, zIndex: 2 },
    Bottom:    { top: 38, height: 42, zIndex: 1 },
    Shoes:     { top: 76, height: 19, zIndex: 4 },
    Accessory: { top: 32, height: 26, zIndex: 5, left: 76, width: 22 },
  },
  subcategorySlots: {
    "Crop Top": { top: 10, height: 23, zIndex: 2 },
  },
  overlapSmall: -6,
  overlapLarge: -12,
  overlapThreshold: 2,
};

// defaultZIndex always reads from hardcoded defaults — immune to stale localStorage/server config.
// Use this for z-ordering instead of reading cfg.mannequinSlots[cat]?.zIndex.
export function defaultZIndex(category: string, subCategory?: string | null): number {
  if (subCategory && defaults.subcategorySlots[subCategory]?.zIndex !== undefined) {
    return defaults.subcategorySlots[subCategory].zIndex;
  }
  return defaults.mannequinSlots[category]?.zIndex ?? 1;
}

const STORAGE_KEY = "wardrobe.outfitConfig.v2";

function load(): OutfitConfig {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw) as Partial<OutfitConfig>;
    const mergedSlots: Record<string, MannequinSlot> = { ...defaults.mannequinSlots };
    if (parsed.mannequinSlots) {
      for (const [cat, slot] of Object.entries(parsed.mannequinSlots)) {
        const def = defaults.mannequinSlots[cat];
        mergedSlots[cat] = { ...def, ...slot, zIndex: def?.zIndex ?? slot.zIndex };
      }
    }
    const mergedSubSlots: Record<string, MannequinSlot> = { ...defaults.subcategorySlots };
    if (parsed.subcategorySlots) {
      for (const [sub, slot] of Object.entries(parsed.subcategorySlots)) {
        const def = defaults.subcategorySlots[sub];
        mergedSubSlots[sub] = { ...def, ...slot, zIndex: def?.zIndex ?? slot.zIndex };
      }
    }
    return {
      ...defaults,
      ...parsed,
      categoryZIndex: { ...defaults.categoryZIndex, ...(parsed.categoryZIndex ?? {}) },
      categoryOrder: parsed.categoryOrder ?? defaults.categoryOrder,
      mannequinSlots: mergedSlots,
      subcategorySlots: mergedSubSlots,
    };
  } catch {
    return structuredClone(defaults);
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

function persist(cfg: OutfitConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

async function pushToServer(cfg: OutfitConfig) {
  try {
    await fetch(`${API_BASE}/api/config/outfit`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
  } catch {}
}

async function fetchFromServer(): Promise<OutfitConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/api/config/outfit`, { credentials: "include" });
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json() as Partial<OutfitConfig>;
    return merge(data);
  } catch {
    return null;
  }
}

function merge(parsed: Partial<OutfitConfig>): OutfitConfig {
  const mergedSlots: Record<string, MannequinSlot> = { ...defaults.mannequinSlots };
  if (parsed.mannequinSlots) {
    for (const [cat, slot] of Object.entries(parsed.mannequinSlots)) {
      const def = defaults.mannequinSlots[cat];
      mergedSlots[cat] = { ...def, ...slot, zIndex: def?.zIndex ?? slot.zIndex };
    }
  }
  const mergedSubSlots: Record<string, MannequinSlot> = { ...defaults.subcategorySlots };
  if (parsed.subcategorySlots) {
    for (const [sub, slot] of Object.entries(parsed.subcategorySlots)) {
      const def = defaults.subcategorySlots[sub];
      mergedSubSlots[sub] = { ...def, ...slot, zIndex: def?.zIndex ?? slot.zIndex };
    }
  }
  return {
    ...defaults,
    ...parsed,
    categoryZIndex: { ...defaults.categoryZIndex, ...(parsed.categoryZIndex ?? {}) },
    categoryOrder: parsed.categoryOrder ?? defaults.categoryOrder,
    mannequinSlots: mergedSlots,
    subcategorySlots: mergedSubSlots,
  };
}

let current: OutfitConfig = load();
const listeners = new Set<() => void>();

function emit() {
  persist(current);
  listeners.forEach((l) => l());
}

// Hydrate from server on boot — replaces localStorage value if server has one
if (typeof window !== "undefined") {
  fetchFromServer().then((serverCfg) => {
    if (serverCfg) {
      current = serverCfg;
      persist(current);
      listeners.forEach((l) => l());
    }
  });
}

export const outfitConfig = {
  get(): OutfitConfig {
    return current;
  },
  set(patch: Partial<OutfitConfig>) {
    current = { ...current, ...patch };
    emit();
    pushToServer(current);
  },
  reset() {
    current = structuredClone(defaults);
    emit();
    pushToServer(current);
  },
  getServerSnapshot(): OutfitConfig {
    return defaults;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  help() {
    console.log(`outfitConfig knobs:
  get()                          → current config
  set({ key: value, ... })       → patch any field
  reset()                        → restore defaults

Fields:
  categoryOrder: string[]                — render order top→bottom
  categoryZIndex: Record<cat, number>    — paint order; higher = front
  overlapSmall: number (-6)              — % overlap when items ≤ overlapThreshold
  overlapLarge: number (-12)             — % overlap when items > overlapThreshold
  overlapThreshold: number (2)

Examples:
  outfitConfig.set({ overlapLarge: -20 })`);
  },
};

if (typeof window !== "undefined") {
  (window as unknown as { outfitConfig: typeof outfitConfig }).outfitConfig = outfitConfig;
}

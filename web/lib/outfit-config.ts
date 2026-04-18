export interface OutfitConfig {
  categoryOrder: string[];
  categoryZIndex: Record<string, number>;
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
  overlapSmall: -6,
  overlapLarge: -12,
  overlapThreshold: 2,
};

const STORAGE_KEY = "wardrobe.outfitConfig.v2";

function load(): OutfitConfig {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw) as Partial<OutfitConfig>;
    return {
      ...defaults,
      ...parsed,
      categoryZIndex: { ...defaults.categoryZIndex, ...(parsed.categoryZIndex ?? {}) },
      categoryOrder: parsed.categoryOrder ?? defaults.categoryOrder,
    };
  } catch {
    return structuredClone(defaults);
  }
}

function persist(cfg: OutfitConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

let current: OutfitConfig = load();
const listeners = new Set<() => void>();

function emit() {
  persist(current);
  listeners.forEach((l) => l());
}

export const outfitConfig = {
  get(): OutfitConfig {
    return current;
  },
  set(patch: Partial<OutfitConfig>) {
    current = { ...current, ...patch };
    emit();
  },
  reset() {
    current = structuredClone(defaults);
    emit();
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

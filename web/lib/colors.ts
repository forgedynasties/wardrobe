// Client-side dominant color extraction using an offscreen canvas.
// Mirrors the quantize + distinct-color logic in internal/vision/colors.go.

// ── Extraction (keep in sync with constants in internal/vision/colors.go) ─────
const MAX_COLORS = 2;            // hard upper bound on colors returned
const COVERAGE_THRESHOLD = 0.8;  // stop once this fraction of pixels is covered
const COLOR_DISTANCE_MIN = 100;   // min Euclidean RGB distance between chosen candidates

// ── Named color library ───────────────────────────────────────────────────────
// Extracted colors are snapped to the nearest entry here using CIELAB ΔE.
// Tune by adding / removing / adjusting entries.
export const COLOR_LIBRARY = [
  // Neutrals
  { name: "Black",       hex: "#000000" },
  { name: "Charcoal",    hex: "#333333" },
  { name: "Dark Gray",   hex: "#555555" },
  { name: "Gray",        hex: "#888888" },
  { name: "Light Gray",  hex: "#bbbbbb" },
  { name: "Off White",   hex: "#f0f0ec" },
  { name: "White",       hex: "#ffffff" },

  // Creams & Browns
  { name: "Cream",       hex: "#fffdd0" },
  { name: "Beige",       hex: "#e8dcc8" },
  { name: "Khaki",       hex: "#c8b896" },
  { name: "Camel",       hex: "#c19a6b" },
  { name: "Tan",         hex: "#d2b48c" },
  { name: "Brown",       hex: "#7b4f2e" },
  { name: "Dark Brown",  hex: "#3e1c00" },

  // Blues
  { name: "Light Blue",  hex: "#add8e6" },
  { name: "Sky Blue",    hex: "#87ceeb" },
  { name: "Cornflower",  hex: "#6495ed" },
  { name: "Blue",        hex: "#2255cc" },
  { name: "Royal Blue",  hex: "#4169e1" },
  { name: "Denim",       hex: "#1560bd" },
  { name: "Dark Blue",   hex: "#002266" },
  { name: "Navy",        hex: "#001040" },

  // Teals & Cyans
  { name: "Turquoise",   hex: "#40e0d0" },
  { name: "Teal",        hex: "#008080" },
  { name: "Dark Teal",   hex: "#004c4c" },

  // Greens
  { name: "Mint",        hex: "#98d8a8" },
  { name: "Sage",        hex: "#8fad88" },
  { name: "Lime",        hex: "#32cd32" },
  { name: "Green",       hex: "#008000" },
  { name: "Forest",      hex: "#228b22" },
  { name: "Olive",       hex: "#6b6b00" },
  { name: "Dark Green",  hex: "#013220" },

  // Yellows & Golds
  { name: "Yellow",      hex: "#ffee00" },
  { name: "Mustard",     hex: "#e3a800" },
  { name: "Gold",        hex: "#ffd700" },
  { name: "Amber",       hex: "#ffbf00" },

  // Oranges
  { name: "Peach",       hex: "#ffcba4" },
  { name: "Orange",      hex: "#ff6600" },
  { name: "Rust",        hex: "#b7410e" },
  { name: "Terracotta",  hex: "#c96a3a" },

  // Reds
  { name: "Coral",       hex: "#ff6b6b" },
  { name: "Red",         hex: "#cc0000" },
  { name: "Crimson",     hex: "#dc143c" },
  { name: "Burgundy",    hex: "#800028" },
  { name: "Maroon",      hex: "#5c0a0a" },
  { name: "Wine",        hex: "#722f37" },

  // Pinks
  { name: "Blush",       hex: "#f4c2c2" },
  { name: "Pink",        hex: "#ff80b0" },
  { name: "Hot Pink",    hex: "#ff1493" },
  { name: "Rose",        hex: "#e0006a" },
  { name: "Deep Pink",   hex: "#aa0055" },

  // Purples
  { name: "Lavender",    hex: "#d8c8f0" },
  { name: "Lilac",       hex: "#b89cd0" },
  { name: "Violet",      hex: "#8b00ff" },
  { name: "Purple",      hex: "#7700aa" },
  { name: "Dark Purple", hex: "#3d0066" },
  { name: "Indigo",      hex: "#3a006f" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToLab(hex: string): [number, number, number] {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);

  // D65 illuminant
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const L = 116 * f(y) - 16;
  const a = 500 * (f(x) - f(y));
  const bb = 200 * (f(y) - f(z));
  return [L, a, bb];
}

function deltaE(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export function snapToLibrary(hex: string): string {
  if (!hex || hex.length < 7) return hex;
  const input = hexToLab(hex);
  let bestHex = hex;
  let bestDist = Infinity;
  for (const entry of COLOR_LIBRARY) {
    const dist = deltaE(input, hexToLab(entry.hex));
    if (dist < bestDist) {
      bestDist = dist;
      bestHex = entry.hex;
    }
  }
  return bestHex;
}

function quantize(v: number): number {
  return Math.floor(v / 16) * 16;
}

function colorDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

export async function extractColorsFromImage(src: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight, 1));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve([]); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const counts = new Map<string, { count: number; rgb: number[] }>();
        let totalPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          totalPixels++;
          const r = quantize(data[i]);
          const g = quantize(data[i + 1]);
          const b = quantize(data[i + 2]);
          const key = `${r},${g},${b}`;
          const entry = counts.get(key);
          if (entry) entry.count++;
          else counts.set(key, { count: 1, rgb: [r, g, b] });
        }

        const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
        const chosen: number[][] = [];
        let covered = 0;
        for (const { rgb, count } of sorted) {
          if (chosen.length >= MAX_COLORS) break;
          if (chosen.every((c) => colorDistance(c, rgb) >= COLOR_DISTANCE_MIN)) {
            chosen.push(rgb);
            covered += count;
            if (covered / totalPixels >= COVERAGE_THRESHOLD) break;
          }
        }

        resolve(
          chosen.map(([r, g, b]) =>
            snapToLibrary(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`)
          ),
        );
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

// Client-side dominant color extraction using an offscreen canvas.
// Mirrors the quantize + distinct-color logic in internal/vision/colors.go.

// ── Extraction ────────────────────────────────────────────────────────────────
const MAX_COLORS = 4;           // hard upper bound on colors returned
const COVERAGE_THRESHOLD = 0.85; // stop adding colors once this fraction of pixels is covered
const COLOR_DISTANCE_MIN = 40;  // min Euclidean RGB distance between chosen colors

// ── Boost: snap extremes ──────────────────────────────────────────────────────
const SNAP_BLACK_L = 15;        // lightness ≤ this → #000000
const SNAP_WHITE_L = 85;        // lightness ≥ this → #ffffff
const NEUTRAL_SAT_MAX = 12;     // saturation below this → skip hue boost (keep gray as gray)

// ── Boost: chroma ─────────────────────────────────────────────────────────────
const BOOST_SAT_FACTOR = 1.6;   // multiply existing saturation by this
const BOOST_SAT_ADD = 25;       // then add this (percentage points)

// ── Boost: lightness contrast ─────────────────────────────────────────────────
const BOOST_DARK_L_FACTOR = 0.8;  // darks: multiply lightness by this
const BOOST_DARK_L_MIN = 12;      // darks: floor after multiplication
const BOOST_LIGHT_L_FACTOR = 0.8; // lights: push distance-to-100 by this factor
const BOOST_LIGHT_L_MAX = 88;     // lights: ceiling

// ─────────────────────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
          : max === g ? ((b - r) / d + 2) / 6
          : ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const h1 = h / 360, s1 = s / 100, l1 = l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    const t2 = ((t % 1) + 1) % 1;
    if (t2 < 1 / 6) return p + (q - p) * 6 * t2;
    if (t2 < 1 / 2) return q;
    if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6;
    return p;
  };
  if (s1 === 0) {
    const v = Math.round(l1 * 255).toString(16).padStart(2, "0");
    return `#${v}${v}${v}`;
  }
  const q = l1 < 0.5 ? l1 * (1 + s1) : l1 + s1 - l1 * s1;
  const p = 2 * l1 - q;
  const r = Math.round(hue2rgb(p, q, h1 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h1) * 255);
  const b = Math.round(hue2rgb(p, q, h1 - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function boostColor(hex: string): string {
  if (!hex || hex.length < 7) return hex;
  const [h, s, l] = hexToHsl(hex);

  if (l <= SNAP_BLACK_L) return "#000000";
  if (l >= SNAP_WHITE_L) return "#ffffff";

  const newS = s < NEUTRAL_SAT_MAX
    ? s
    : Math.min(100, s * BOOST_SAT_FACTOR + BOOST_SAT_ADD);

  const newL = l < 50
    ? Math.max(BOOST_DARK_L_MIN, l * BOOST_DARK_L_FACTOR)
    : Math.min(BOOST_LIGHT_L_MAX, 100 - (100 - l) * BOOST_LIGHT_L_FACTOR);

  return hslToHex(h, newS, newL);
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
          chosen.map(([r, g, b]) => boostColor(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`)),
        );
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

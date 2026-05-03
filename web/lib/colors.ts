// Client-side dominant color extraction using an offscreen canvas.
// Mirrors the quantize + distinct-color logic in internal/vision/colors.go.

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
  const newS = Math.min(100, s * 1.6 + 25);
  const newL = l < 50 ? Math.max(12, l * 0.8) : Math.min(88, 100 - (100 - l) * 0.8);
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

const MAX_COLORS = 4;
const COVERAGE_THRESHOLD = 0.85;

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
          if (chosen.every((c) => colorDistance(c, rgb) >= 40)) {
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

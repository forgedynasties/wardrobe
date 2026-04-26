// Client-side dominant color extraction using an offscreen canvas.
// Mirrors the quantize + distinct-color logic in internal/vision/colors.go.

function quantize(v: number): number {
  return Math.floor(v / 16) * 16;
}

function colorDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

export async function extractColorsFromImage(src: string, maxColors = 5): Promise<string[]> {
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
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue; // skip transparent
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
        for (const { rgb } of sorted) {
          if (chosen.length >= maxColors) break;
          if (chosen.every((c) => colorDistance(c, rgb) >= 40)) {
            chosen.push(rgb);
          }
        }

        resolve(
          chosen.map(([r, g, b]) => `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`),
        );
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

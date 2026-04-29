const PIXEL_GRID = 8;

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function vibrate(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.04) return hex;
  const h = (max === r ? (g - b) / d + (g < b ? 6 : 0)
           : max === g ? (b - r) / d + 2
           : (r - g) / d + 4) / 6 * 360;
  return hslToHex(h, 80, 52);
}

interface CategoryPixelBoxProps {
  colors: string[];
  size?: number;
}

export function CategoryPixelBox({ colors, size = 40 }: CategoryPixelBoxProps) {
  if (colors.length === 0) return null;
  const vivid = colors.map(vibrate);
  const pixels = Array.from({ length: PIXEL_GRID * PIXEL_GRID }, (_, i) => {
    const row = Math.floor(i / PIXEL_GRID);
    const col = i % PIXEL_GRID;
    return vivid[(row + col) % vivid.length];
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${PIXEL_GRID}, 1fr)`,
        width: size,
        height: size,
        borderRadius: 4,
        overflow: "hidden",
        imageRendering: "pixelated",
      }}
    >
      {pixels.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

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

function soften(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.04) return hex;
  const h = (max === r ? (g - b) / d + (g < b ? 6 : 0)
           : max === g ? (b - r) / d + 2
           : (r - g) / d + 4) / 6 * 360;
  return hslToHex(h, 55, 58);
}

interface CategoryPixelBoxProps {
  colors: string[];
  size?: number;
}

export function CategoryPixelBox({ colors, size = 40 }: CategoryPixelBoxProps) {
  if (colors.length === 0) return null;
  const c = colors.slice(0, 3).map(soften);
  const c0 = c[0];
  const c1 = c[1] ?? c[0];
  const c2 = c[2] ?? c[1] ?? c[0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -4,
          backgroundImage: `
            radial-gradient(circle at 30% 40%, ${c0}dd, transparent 65%),
            radial-gradient(circle at 72% 62%, ${c1}cc, transparent 60%),
            radial-gradient(circle at 50% 15%, ${c2}aa, transparent 65%)
          `,
          backgroundColor: "rgba(30,30,30,0.9)",
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}

"use client";

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
  if (!hex.startsWith("#") || hex.length < 7) return hex;
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

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) & 0x7fffffff;
  }
  return h >>> 0;
}

function hashToColors(username: string): string[] {
  const h = hash(username);
  const hue1 = h % 360;
  const hue2 = (hue1 + 137) % 360;
  const hue3 = (hue1 + 74) % 360;
  return [
    hslToHex(hue1, 55, 58),
    hslToHex(hue2, 55, 58),
    hslToHex(hue3, 50, 50),
  ];
}

interface Props {
  colors: string[];
  username?: string;
  size?: number;
  className?: string;
}

export function HangurAvatar({ colors, username = "", size = 48, className }: Props) {
  const palette = colors.length > 0
    ? [...new Set(colors)].slice(0, 3).map(soften)
    : hashToColors(username);

  const c0 = palette[0];
  const c1 = palette[1] ?? palette[0];
  const c2 = palette[2] ?? palette[1] ?? palette[0];

  const id = `blob-${username || "x"}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ borderRadius: "50%", display: "block" }}
    >
      <defs>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        {/* dark base */}
        <rect width="100" height="100" fill="#161616" />

        {/* blobs */}
        <g filter={`url(#${id}-blur)`}>
          <circle cx="35" cy="40" r="45" fill={c0} fillOpacity="0.85" />
          <circle cx="68" cy="62" r="40" fill={c1} fillOpacity="0.75" />
          <circle cx="50" cy="18" r="36" fill={c2} fillOpacity="0.65" />
        </g>
      </g>
    </svg>
  );
}

"use client";

import { useMemo } from "react";

function hashUsername(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function hashToGradient(username: string): [string, string] {
  const h = hashUsername(username);
  const hue1 = h % 360;
  const hue2 = (hue1 + 137) % 360;
  return [`hsl(${hue1},60%,55%)`, `hsl(${hue2},60%,55%)`];
}

interface Props {
  colors: string[];
  username?: string;
  size?: number;
  className?: string;
}

export function WardrobeAvatar({ colors, username = "", size = 48, className }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.3;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;

  const displayColors = useMemo(() => [...new Set(colors)].slice(0, 8), [colors]);

  const gradId = `wa-${username.replace(/[^a-z0-9]/gi, "") || "x"}`;

  if (displayColors.length === 0) {
    const [c1, c2] = hashToGradient(username);
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={cx} fill={`url(#${gradId})`} />
      </svg>
    );
  }

  if (displayColors.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
        <circle cx={cx} cy={cy} r={cx} fill={displayColors[0]} />
      </svg>
    );
  }

  const n = displayColors.length;
  const gapPx = Math.max(1.5, size * 0.03);
  const segLen = circ / n - gapPx;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        {displayColors.map((color, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segLen} ${circ - segLen}`}
            strokeDashoffset={-(i * (circ / n))}
            strokeLinecap="butt"
          />
        ))}
      </g>
    </svg>
  );
}

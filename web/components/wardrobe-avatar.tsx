"use client";

import { useMemo } from "react";

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) & 0x7fffffff;
  }
  return h >>> 0;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashToColors(username: string): string[] {
  const h = hash(username);
  const hue1 = h % 360;
  const hue2 = (hue1 + 137) % 360;
  const hue3 = (hue1 + 74) % 360;
  return [
    `hsl(${hue1},60%,55%)`,
    `hsl(${hue2},60%,55%)`,
    `hsl(${hue3},55%,45%)`,
  ];
}

const GRID = 8;

interface Props {
  colors: string[];
  username?: string;
  size?: number;
  className?: string;
}

export function WardrobeAvatar({ colors, username = "", size = 48, className }: Props) {
  const palette = colors.length > 0 ? [...new Set(colors)].slice(0, 10) : hashToColors(username);

  const cells = useMemo(() => {
    const rand = seededRng(hash(username || "x"));
    return Array.from({ length: GRID * GRID }, () => palette[Math.floor(rand() * palette.length)]);
  }, [username, palette.join(",")]);

  const cell = size / GRID;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      shapeRendering="crispEdges"
    >
      {cells.map((color, i) => {
        const col = i % GRID;
        const row = Math.floor(i / GRID);
        return (
          <rect
            key={i}
            x={col * cell}
            y={row * cell}
            width={cell}
            height={cell}
            fill={color}
          />
        );
      })}
    </svg>
  );
}

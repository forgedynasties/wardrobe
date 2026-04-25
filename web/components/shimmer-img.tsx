"use client";

import { useState } from "react";

interface ShimmerImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function ShimmerImg({ src, alt, className, style, ...rest }: ShimmerImgProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="relative block w-full h-full">
      {!loaded && (
        <span className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </span>
  );
}

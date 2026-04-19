import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1410 0%, #0a0908 100%)",
          color: "#d9a87a",
          fontFamily: "system-ui, sans-serif",
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        W
      </div>
    ),
    { ...size },
  );
}

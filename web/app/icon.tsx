import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="192" height="192">
          <path fill="white" d="M26 7v4h-4v14h-12v-14h-4v-4h8v4h4v-4h8z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}

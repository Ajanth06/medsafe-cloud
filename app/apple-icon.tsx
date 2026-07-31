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
          background:
            "linear-gradient(145deg, #111827 0%, #0b1520 56%, #07111a 100%)",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            background: "linear-gradient(145deg, #fb923c, #ea580c)",
            color: "white",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 3,
            boxShadow: "0 14px 38px rgba(249,115,22,0.35)",
          }}
        >
          AX
        </div>
      </div>
    ),
    { ...size },
  );
}

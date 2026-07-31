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
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              color: "#F97316",
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -4,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            A
          </div>
          <div
            style={{
              width: 72,
              height: 8,
              borderRadius: 4,
              background: "#22D3EE",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

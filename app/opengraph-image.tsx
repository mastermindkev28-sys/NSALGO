import { ImageResponse } from "next/og";

export const alt = "NSALGO — See the market with direction.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07080a", padding: 72, color: "#e9edf3", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path d="M16 1.5 17.55 15.95 26.5 17.5 17.55 19.05 16 28.5 14.45 19.05 5.5 17.5 14.45 15.95Z" fill="#e9edf3" />
          </svg>
          <div style={{ fontSize: 30, letterSpacing: 12, fontWeight: 700 }}>NSALGO</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3 }}>SEE THE MARKET</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3, color: "#9aa3b0" }}>WITH DIRECTION.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#737b88" }}>
          <div>Market intelligence · ATLAS · Options · Disclosures</div>
          <div style={{ letterSpacing: 8, color: "#b1b7c1" }}>ATLAS</div>
        </div>
      </div>
    ),
    size,
  );
}

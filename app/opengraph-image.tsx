import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "NSALGO — See the market with direction.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const lockup = `data:image/png;base64,${(await readFile(join(process.cwd(), "assets/brand/lockup.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "radial-gradient(ellipse at 78% 40%, #16203a 0%, #07080a 60%)", padding: "72px 88px", color: "#e9edf3", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 0.98, letterSpacing: -3 }}>SEE THE MARKET</div>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 0.98, letterSpacing: -3, color: "#9aa3b0" }}>WITH DIRECTION.</div>
          </div>
          <div style={{ fontSize: 22, color: "#737b88" }}>Market intelligence · ATLAS · Options · Disclosures</div>
        </div>
        <img src={lockup} width={380} height={395} alt="" />
      </div>
    ),
    size,
  );
}

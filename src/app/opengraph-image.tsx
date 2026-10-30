import { ImageResponse } from "next/og";

export const alt = "Feyo — open-source Stellar Testnet workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "center", padding: 80, background: "#081d25",
      color: "#effffb", fontFamily: "sans-serif",
    }}>
      <div style={{ display: "flex", fontSize: 70, fontWeight: 800 }}>feyo<span style={{ color: "#63e0c2" }}>.</span></div>
      <div style={{ display: "flex", marginTop: 42, fontSize: 47, fontWeight: 700 }}>Stellar Testnet payments</div>
      <div style={{ display: "flex", marginTop: 25, fontSize: 27, color: "#b9d7d5" }}>Read-only balances · Local drafts · Developer docs</div>
      <div style={{ display: "flex", marginTop: 70, fontSize: 21, color: "#63e0c2" }}>EARLY-STAGE · NO LIVE PAYMENTS</div>
    </div>,
    { ...size }
  );
}

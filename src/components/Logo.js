import React from "react";

function HangerT({ size = 20 }) {
  // Scale factor relative to base size 20
  const s = size / 20;
  // t stem: from (330,114) to (330,72) — scaled around center
  // Hook: half-c curving left from stem top
  // We render as inline SVG sized to match the font
  const h = size * 1.2;
  const w = size * 1.4;

  return (
    <svg
      width={w}
      height={h}
      viewBox="280 44 80 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle", marginBottom: size * 0.08 }}
      aria-hidden="true"
    >
      {/* t stem */}
      <line x1="330" y1="114" x2="330" y2="72"
        stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
      {/* t crossbar */}
      <line x1="313" y1="86" x2="347" y2="86"
        stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
      {/* Half-c hook — curves left and up from stem top, opens right */}
      <path d="M 330 72 C 324 58 312 50 300 50 C 288 50 280 58 280 68"
        stroke="currentColor" fill="none" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function Logo({ size = 20, onClick, style = {} }) {
  return (
    <div
      className="logo"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        fontSize: size,
        display: "flex",
        alignItems: "center",
        gap: 0,
        lineHeight: 1,
        ...style,
      }}
    >
      <em style={{ fontWeight: 300, fontStyle: "italic" }}>close</em>
      <HangerT size={size} />
      <span style={{ fontWeight: 800 }}>mingle</span>
    </div>
  );
}

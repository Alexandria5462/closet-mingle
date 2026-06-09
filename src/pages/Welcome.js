import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center" }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          {/* Wordmark */}
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, color: "var(--text-primary)", letterSpacing: -1, lineHeight: 1 }}>
            <span style={{ fontWeight: 300, fontStyle: "italic" }}>closet</span>
            <span style={{ fontWeight: 800 }}>mingle</span>
          </div>
          {/* Terracotta rule */}
          <div style={{ height: 1.5, background: "#c4745a", margin: "10px 0 8px" }} />
          {/* Tagline */}
          <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 11, color: "var(--text-tertiary)", letterSpacing: 4, textTransform: "uppercase" }}>
            Wardrobe&nbsp;&bull;&nbsp;Style&nbsp;&bull;&nbsp;You
          </div>
        </div>

        {/* Feature tiles */}
        <div style={{ width: "100%", maxWidth: 320, marginBottom: 12 }}>
          {[
            { icon: "ti-sparkles", text: "Outfits built from your own closet" },
            { icon: "ti-scissors", text: "Chat with real personal stylists" },
            { icon: "ti-palette", text: "Color-matched, curated looks" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, background: "var(--bg-card)", borderRadius: "var(--radius)", padding: "12px 16px", border: "0.5px solid var(--border)" }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: 18, color: "var(--pink)", flexShrink: 0 }} aria-hidden="true"></i>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "20px 32px", paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
        <button className="btn-pink" onClick={() => nav("/signup")} style={{ fontSize: 16, padding: 14, marginBottom: 12 }}>
          Get started — it's free
        </button>
        <button className="btn-outline" onClick={() => nav("/login")} style={{ fontSize: 15 }}>
          Sign in
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--text-tertiary)" }}>
          By continuing you agree to our{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/terms")}>Terms</span>
          {" "}and{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/privacy")}>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}

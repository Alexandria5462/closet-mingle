import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const nav = useNavigate();
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Hero section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>👗</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, marginBottom: 8, color: "var(--text-primary)" }}>
          Closet<span style={{ color: "var(--pink)" }}>Mingle</span>
        </div>
        <div style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
          AI-powered personal styling from your own wardrobe
        </div>
        {/* Feature highlights */}
        {[
          { icon: "✨", text: "AI builds outfits from your closet" },
          { icon: "✂️", text: "Chat with real personal stylists" },
          { icon: "🎨", text: "Color-matched, trend-aware looks" },
        ].map(f => (
          <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, background: "var(--bg-card)", borderRadius: "var(--radius)", padding: "12px 16px", width: "100%", maxWidth: 320, border: "0.5px solid var(--border)" }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f.text}</span>
          </div>
        ))}
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

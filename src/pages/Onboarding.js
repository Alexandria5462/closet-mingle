import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

const STEPS = [
  {
    emoji: "👗",
    title: "Welcome to ClosetMingle!",
    subtitle: "Your AI-powered personal stylist",
    description: "We will help you build amazing outfits from clothes you already own. Let us show you how it works.",
    action: "Get started",
    color: "var(--pink-light)",
  },
  {
    emoji: "📸",
    title: "Upload your clothes",
    subtitle: "Step 1 — Build your closet",
    description: "Go to your Closet tab and upload photos of your clothing items. Our AI will automatically detect colors, patterns and materials from each photo.",
    action: "Next",
    color: "#f0fdf4",
  },
  {
    emoji: "💗",
    title: "Swipe to like items",
    subtitle: "Step 2 — Tell us what you love",
    description: "On the Swipe page, swipe right on items you love and left on ones you want to skip. Like a top AND a bottom or a dress to unlock outfit generation.",
    action: "Next",
    color: "#fce7f3",
  },
  {
    emoji: "✨",
    title: "AI builds your outfits",
    subtitle: "Step 3 — Generate outfits",
    description: "Go to your Liked Items page and tap Generate AI Outfits. Our AI analyzes your clothing colors, patterns and materials to build perfectly matched outfits just for you.",
    action: "Next",
    color: "#ede9fe",
  },
  {
    emoji: "🔖",
    title: "Save your favorites",
    subtitle: "Step 4 — Keep what you love",
    description: "Save outfits you love to your Saved page. You can also chat with a real personal stylist for expert advice tailored to your wardrobe.",
    action: "Start styling!",
    color: "#dbeafe",
  },
];

export default function Onboarding() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);

  async function complete() {
    try {
      await setDoc(doc(db, "onboarding", currentUser.uid), {
        completed: true,
        completedAt: new Date().toISOString(),
      });
    } catch (e) { console.error(e); }
    nav("/home");
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else complete();
  }

  const s = STEPS[step];

  return (
    <div style={{ minHeight: "100dvh", background: s.color, display: "flex", flexDirection: "column", transition: "background 0.4s ease" }}>
      {/* Skip button */}
      <div style={{ padding: "max(16px, env(safe-area-inset-top)) 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={complete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 13 }}>
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "12px 0" }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i === step ? "var(--pink)" : "rgba(0,0,0,0.15)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 24, animation: "bounce 0.5s ease" }}>{s.emoji}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pink)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.subtitle}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, lineHeight: 1.2 }}>{s.title}</div>
        <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 320 }}>{s.description}</div>
      </div>

      {/* Action button */}
      <div style={{ padding: "20px 32px", paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
        <button className="btn-pink" onClick={next} style={{ fontSize: 16, padding: "14px" }}>
          {s.action}
        </button>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 13, width: "100%", marginTop: 12 }}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

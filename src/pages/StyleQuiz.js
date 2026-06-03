import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import Toast from "../components/Toast";

const QUESTIONS = [
  {
    id: "vibe",
    question: "What best describes your everyday style vibe?",
    options: [
      { label: "Clean and minimal", value: "minimalist", emoji: "🤍" },
      { label: "Bold and expressive", value: "bold", emoji: "🔥" },
      { label: "Relaxed and casual", value: "casual", emoji: "😎" },
      { label: "Polished and professional", value: "professional", emoji: "💼" },
    ],
  },
  {
    id: "occasion",
    question: "What do you dress for most often?",
    options: [
      { label: "Work or office", value: "work", emoji: "🏢" },
      { label: "Going out and events", value: "social", emoji: "🎉" },
      { label: "Everyday errands", value: "everyday", emoji: "🛍️" },
      { label: "Special occasions", value: "special", emoji: "✨" },
    ],
  },
  {
    id: "color",
    question: "What colors do you gravitate toward?",
    options: [
      { label: "Neutrals — black, white, grey, beige", value: "neutrals", emoji: "🖤" },
      { label: "Earth tones — brown, olive, rust, tan", value: "earth", emoji: "🌿" },
      { label: "Bold colors — red, cobalt, fuchsia", value: "bold_colors", emoji: "🌈" },
      { label: "Pastels — blush, lavender, mint", value: "pastels", emoji: "🌸" },
    ],
  },
  {
    id: "pattern",
    question: "How do you feel about patterns?",
    options: [
      { label: "I prefer solids only", value: "solids", emoji: "⬛" },
      { label: "Subtle patterns like stripes or plaid", value: "subtle", emoji: "〰️" },
      { label: "I love mixing patterns", value: "mixed", emoji: "🎨" },
      { label: "Statement prints — florals, animal print", value: "statement", emoji: "🐆" },
    ],
  },
  {
    id: "fit",
    question: "What silhouette do you prefer?",
    options: [
      { label: "Fitted and structured", value: "fitted", emoji: "✂️" },
      { label: "Relaxed and oversized", value: "oversized", emoji: "👕" },
      { label: "Flowy and feminine", value: "flowy", emoji: "👗" },
      { label: "Mix — fitted top, loose bottom (or vice versa)", value: "mix", emoji: "⚖️" },
    ],
  },
  {
    id: "budget",
    question: "What is your typical styling budget per session?",
    options: [
      { label: "I just want outfit ideas, no shopping", value: "no_shopping", emoji: "💡" },
      { label: "Under $50", value: "budget", emoji: "💵" },
      { label: "$50 to $200", value: "mid_range", emoji: "💳" },
      { label: "$200 and above", value: "luxury", emoji: "💎" },
    ],
  },
];

export default function StyleQuiz() {
  const nav = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  function selectAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  function next() {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      submitQuiz();
    }
  }

  function back() {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  }

  async function submitQuiz() {
    setSubmitting(true);
    try {
      // Delete existing quiz result
      const existing = await getDocs(query(collection(db, "styleQuiz"), where("userId", "==", currentUser.uid)));
      for (const d of existing.docs) {
        await deleteDoc(doc(db, "styleQuiz", d.id));
      }

      // Save new quiz result
      const result = {
        userId: currentUser.uid,
        answers,
        styleProfile: buildStyleProfile(answers),
        completedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "styleQuiz"), result);
      setDone(true);
    } catch (e) {
      setToast("Failed to save quiz. Try again.");
    }
    setSubmitting(false);
  }

  function buildStyleProfile(a) {
    const labels = {
      vibe: { minimalist: "Minimalist", bold: "Bold & Expressive", casual: "Relaxed Casual", professional: "Polished Professional" },
      color: { neutrals: "Neutral Palette", earth: "Earth Tone Lover", bold_colors: "Bold Color Enthusiast", pastels: "Pastel Dreamer" },
      pattern: { solids: "Clean Solids", subtle: "Subtle Patterns", mixed: "Pattern Mixer", statement: "Statement Prints" },
      fit: { fitted: "Structured Fits", oversized: "Relaxed Silhouettes", flowy: "Flowy & Feminine", mix: "Mix & Match" },
    };
    return {
      primaryStyle: labels.vibe[a.vibe] || "Unique",
      colorPreference: labels.color[a.color] || "Varied",
      patternStyle: labels.pattern[a.pattern] || "Mixed",
      fitPreference: labels.fit[a.fit] || "Varied",
      occasion: a.occasion || "everyday",
      budget: a.budget || "mid_range",
    };
  }

  const q = QUESTIONS[currentQ];
  const progress = ((currentQ) / QUESTIONS.length) * 100;
  const hasAnswer = answers[q?.id];

  if (done) {
    const profile = buildStyleProfile(answers);
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
        </div>
        <div className="screen">
          <div className="body" style={{ textAlign: "center", paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Your Style Profile</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>This helps us match you with the perfect stylist</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginBottom: 24 }}>
              {[
                { label: "Primary Style", value: profile.primaryStyle, icon: "👗" },
                { label: "Color Preference", value: profile.colorPreference, icon: "🎨" },
                { label: "Pattern Style", value: profile.patternStyle, icon: "🔲" },
                { label: "Fit Preference", value: profile.fitPreference, icon: "✂️" },
              ].map(item => (
                <div key={item.label} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-pink" onClick={() => nav("/stylists")} style={{ marginBottom: 10 }}>
              Find My Perfect Stylist →
            </button>
            <button className="btn-outline" onClick={() => nav("/account")}>
              Back to Profile
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => currentQ === 0 ? nav("/account") : back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{currentQ + 1} of {QUESTIONS.length}</span>
      </div>

      <div className="screen">
        <div className="body">
          {/* Progress bar */}
          <div style={{ background: "var(--border)", borderRadius: 10, height: 4, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ background: "var(--pink)", height: "100%", width: `${progress}%`, borderRadius: 10, transition: "width 0.3s ease" }} />
          </div>

          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>{q.question}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>Select one option</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {q.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => selectAnswer(q.id, opt.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  borderRadius: "var(--radius)", border: `2px solid ${answers[q.id] === opt.value ? "var(--pink)" : "var(--border)"}`,
                  background: answers[q.id] === opt.value ? "var(--pink-light)" : "var(--bg-card)",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 24 }}>{opt.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: answers[q.id] === opt.value ? 500 : 400, color: "var(--text-primary)" }}>{opt.label}</span>
                {answers[q.id] === opt.value && (
                  <i className="ti ti-check" style={{ marginLeft: "auto", color: "var(--pink)", fontSize: 16 }} aria-hidden="true"></i>
                )}
              </button>
            ))}
          </div>

          <button className="btn-pink" onClick={next} disabled={!hasAnswer || submitting}>
            {submitting
              ? <span className="spinner"></span>
              : currentQ === QUESTIONS.length - 1 ? "See my style profile →" : "Next →"
            }
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

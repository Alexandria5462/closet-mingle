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
 { label: "Clean and minimal", value: "minimalist" },
 { label: "Bold and expressive", value: "bold" },
 { label: "Relaxed and casual", value: "casual" },
 { label: "Polished and professional", value: "professional" },
 ],
 },
 {
 id: "occasion",
 question: "What do you dress for most often?",
 options: [
 { label: "Work or office", value: "work" },
 { label: "Going out and events", value: "social" },
 { label: "Everyday errands", value: "everyday" },
 { label: "Special occasions", value: "special" },
 ],
 },
 {
 id: "color",
 question: "What colors do you gravitate toward?",
 options: [
 { label: "Neutrals — black, white, grey, beige", value: "neutrals" },
 { label: "Earth tones — brown, olive, rust, tan", value: "earth" },
 { label: "Bold colors — red, cobalt, fuchsia", value: "bold_colors" },
 { label: "Pastels — blush, lavender, mint", value: "pastels" },
 ],
 },
 {
 id: "pattern",
 question: "How do you feel about patterns?",
 options: [
 { label: "I prefer solids only", value: "solids" },
 { label: "Subtle patterns like stripes or plaid", value: "subtle" },
 { label: "I love mixing patterns", value: "mixed" },
 { label: "Statement prints — florals, animal print", value: "statement" },
 ],
 },
 {
 id: "fit",
 question: "What silhouette do you prefer?",
 options: [
 { label: "Fitted and structured", value: "fitted" },
 { label: "Relaxed and oversized", value: "oversized" },
 { label: "Flowy and feminine", value: "flowy" },
 { label: "Mix — fitted top, loose bottom", value: "mix" },
 ],
 },
 {
 id: "budget",
 question: "What is your typical styling budget per session?",
 options: [
 { label: "Just outfit ideas, no shopping", value: "no_shopping" },
 { label: "Under $50", value: "budget" },
 { label: "$50 to $200", value: "mid_range" },
 { label: "$200 and above", value: "luxury" },
 ],
 },
];

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

export default function StyleQuiz() {
 const nav = useNavigate();
 const { currentUser, userProfile } = useAuth();
  const isStylist = userProfile?.accountType === "stylist";
 const [currentQ, setCurrentQ] = useState(0);
 const [answers, setAnswers] = useState({});
 const [submitting, setSubmitting] = useState(false);
 const [done, setDone] = useState(false);
 const [toast, setToast] = useState("");
 const [savedProfile, setSavedProfile] = useState(null);

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
 if (!currentUser?.uid) {
 setToast("You must be logged in to save your quiz.");
 return;
 }
 setSubmitting(true);
 try {
 // Delete any existing quiz result first
 const existing = await getDocs(
 query(collection(db, "styleQuiz"), where("userId", "==", currentUser.uid))
 );
 for (const d of existing.docs) {
 await deleteDoc(doc(db, "styleQuiz", d.id));
 }

 const profile = buildStyleProfile(answers);

 // Save new quiz result
 await addDoc(collection(db, "styleQuiz"), {
 userId: currentUser.uid,
 answers,
 styleProfile: profile,
 completedAt: new Date().toISOString(),
 });

 setSavedProfile(profile);
 setDone(true);
 } catch (e) {
 console.error("Quiz save error:", e.message || e);
 // Common cause: Firestore rules blocking write
 // Check Firebase console > Firestore > Rules > styleQuiz collection
 setToast("Failed to save. Check your connection and try again.");
 }
 setSubmitting(false);
 }

 // ── Results screen ────────────────────────────────────────
 if (done && savedProfile) {
 return (
 <>
 <div className="header">
 <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
 <em>closet</em><span>mingle</span>
 </div>
 </div>
 <div className="screen">
 <div className="body" style={{ paddingTop: 24 }}>
 <div style={{ textAlign: "center", marginBottom: 24 }}>
 <div style={{ fontSize: 48, marginBottom: 12 }}></div>
 <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Your Style Profile</div>
 <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
 We will use this to match you with the perfect stylist
 </div>
 </div>

 <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
 {[
 { label: "Primary Style", value: savedProfile.primaryStyle, icon: "" },
 { label: "Color Preference", value: savedProfile.colorPreference, icon: "" },
 { label: "Pattern Style", value: savedProfile.patternStyle, icon: "" },
 { label: "Fit Preference", value: savedProfile.fitPreference, icon: "" },
 ].map(item => (
 <div key={item.label} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <span style={{ fontSize: 24 }}>{item.icon}</span>
 <div>
 <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.label}</div>
 <div style={{ fontSize: 15, fontWeight: 500 }}>{item.value}</div>
 </div>
 </div>
 ))}
 </div>

 <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#065f46" }}>
 Your style profile has been saved! Stylists will use this to personalize their recommendations for you.
 </div>

 {/* Go to stylist page — the main purpose of the quiz */}
 <button className="btn-pink" onClick={() => nav("/find-stylist")} style={{ marginBottom: 10 }}>
 Find My Perfect Stylist →
 </button>
 <button className="btn-outline" onClick={() => nav(isStylist ? "/stylist" : "/home")}>
 Back
 </button>
 </div>
 </div>
 {toast && <Toast message={toast} onDone={() => setToast("")} />}
 </>
 );
 }

 const q = QUESTIONS[currentQ];
 const progress = (currentQ / QUESTIONS.length) * 100;
 const hasAnswer = !!answers[q?.id];

 return (
 <>
 <div className="header">
 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
 <button
 onClick={() => currentQ === 0 ? nav(isStylist ? "/stylist" : "/home") : back()}
 style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
 >
 <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
 </button>
 <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
 <em>closet</em><span>mingle</span>
 </div>
 </div>
 <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
 {currentQ + 1} of {QUESTIONS.length}
 </span>
 </div>

 <div className="screen">
 <div className="body">
 {/* Progress bar */}
 <div style={{ background: "var(--border)", borderRadius: 10, height: 5, marginBottom: 24, overflow: "hidden" }}>
 <div style={{ background: "var(--pink)", height: "100%", width: `${progress}%`, borderRadius: 10, transition: "width 0.3s ease" }} />
 </div>

 <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
 {q.question}
 </div>
 <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
 Select one option
 </div>

 <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
 {q.options.map(opt => (
 <button
 key={opt.value}
 onClick={() => selectAnswer(q.id, opt.value)}
 style={{
 display: "flex", alignItems: "center", gap: 12,
 padding: "14px 16px", borderRadius: "var(--radius)",
 border: `2px solid ${answers[q.id] === opt.value ? "var(--pink)" : "var(--border)"}`,
 background: answers[q.id] === opt.value ? "var(--pink-light)" : "var(--bg-card)",
 cursor: "pointer", textAlign: "left", fontFamily: "inherit",
 transition: "all 0.15s",
 }}
 >
 <span style={{ fontSize: 24, flexShrink: 0 }}></span>
 <span style={{ fontSize: 14, fontWeight: answers[q.id] === opt.value ? 500 : 400, color: "var(--text-primary)", flex: 1 }}>
 {opt.label}
 </span>
 {answers[q.id] === opt.value && (
 <i className="ti ti-check" style={{ color: "var(--pink)", fontSize: 16, flexShrink: 0 }} aria-hidden="true"></i>
 )}
 </button>
 ))}
 </div>

 <button
 className="btn-pink"
 onClick={next}
 disabled={!hasAnswer || submitting}
 >
 {submitting
 ? <span className="spinner"></span>
 : currentQ === QUESTIONS.length - 1
 ? "See my style profile →"
 : "Next →"
 }
 </button>
 </div>
 </div>

 {toast && <Toast message={toast} onDone={() => setToast("")} />}
 </>
 );
}

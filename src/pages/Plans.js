import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    badge: null,
    color: "#f9fafb",
    features: [
      "Upload unlimited clothing items",
      "AI outfit suggestions",
      "Swipe and liked items",
      "3 outfit generations per day",
      "Max 20 liked items at a time",
      "Watermark on saved outfit screenshots",
    ],
    locked: [
      "No stylist chat or recommendations",
      "Cannot view stylist profiles or reviews",
      "Time limits on swiping and generating",
    ],
  },
  {
    id: "monthly",
    name: "Premium AI",
    price: "$9.99",
    period: "/mo",
    badge: "Most Popular",
    color: "#fce7f3",
    features: [
      "Everything in Free",
      "No time constraints — anything in the app",
      "Unlimited stylist chat (text only)",
      "Photo sharing with stylist",
      "View stylist profiles and ratings",
      "AI randomly assigns your stylist",
      "Early access to new features",
    ],
    locked: [
      "Cannot personally choose your stylist",
      "No video calls",
    ],
  },
  {
    id: "premium_plus",
    name: "Premium Plus",
    price: "$19.99",
    period: "/mo",
    badge: "Best Value",
    color: "#ede9fe",
    features: [
      "Everything in Premium AI",
      "Unlimited video calls with stylists",
      "Choose your own stylist personally",
      "Priority stylist matching",
      "Dedicated stylist session to session",
      "Outfit history saves for 7 days",
      "Style profile quiz for perfect matching",
    ],
    locked: [],
  },
  {
    id: "session",
    name: "Pay Per Session",
    price: "$7.99",
    period: "/session",
    badge: null,
    color: "#f0fdf4",
    features: [
      "One live stylist chat session",
      "Session lasts 24 hours from first message",
      "Photo sharing included",
      "No commitment",
      "Can upgrade to monthly mid-session with credit",
    ],
    locked: [
      "AI randomly assigns your stylist",
      "No video calls",
    ],
  },
];

export default function Plans() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          subscriptionTier: selected,
          subscriptionUpdatedAt: new Date().toISOString(),
        });
      }
      nav("/home");
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Closet<span>Mingle</span>
        </div>
      </div>
      <div className="body">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Choose your plan</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Upgrade anytime. Cancel anytime.</div>
        </div>

        {PLANS.map(p => (
          <div
            key={p.id}
            className={`plan-card${selected === p.id ? " selected" : ""}`}
            onClick={() => setSelected(p.id)}
            style={{ background: selected === p.id ? p.color : "var(--bg-card)" }}
          >
            {p.badge && (
              <div style={{ marginBottom: 8 }}>
                <span className="badge badge-pink">{p.badge}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
              </div>
              <div>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{p.price}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{p.period}</span>
              </div>
            </div>
            <hr className="divider" />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {p.features.map(f => (
                <span key={f} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6 }}>
                  <i className="ti ti-check" style={{ color: "var(--success)", fontSize: 13, flexShrink: 0 }} aria-hidden="true"></i>
                  {f}
                </span>
              ))}
              {p.locked.map(f => (
                <span key={f} style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 6 }}>
                  <i className="ti ti-x" style={{ fontSize: 13, flexShrink: 0 }} aria-hidden="true"></i>
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-pink" onClick={handleSelect} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? <span className="spinner"></span> : "Get started"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 10 }}>
          Payments processed securely by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

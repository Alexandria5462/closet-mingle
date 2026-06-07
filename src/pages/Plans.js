import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";


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
      "Watermark on saved outfit screenshots",
    ],
    locked: [
      "Time constraints on swiping and generating",
      "No stylist chat or recommendations",
      "Cannot view stylist profiles or reviews",
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
      "Everything in Free — no time constraints",
      "Unlimited stylist chat (text only)",
      "Photo sharing with stylist",
      "View stylist profiles and ratings",
      "Style profile quiz for better stylist matching",
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
    name: "Try a Session",
    price: "$9.99",
    period: "/session",
    badge: "Free Plan Add-On",
    color: "#f0fdf4",
    features: [
      "Available to free accounts only",
      "One live stylist chat + video session",
      "Session lasts 24 hours from first message",
      "Photo sharing included",
      "Video call included",
      "Style profile quiz included",
      "No commitment",
      "Can upgrade to a monthly plan mid-session with credit",
    ],
    locked: [
      "AI randomly assigns your stylist",
      "Not available to existing paid subscribers",
    ],
  },
];

export default function Plans() {
  const nav = useNavigate();
  const { currentUser, userProfile, updateSubscription } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    try {
      if (currentUser) {
        // updateSubscription uses real-time listener
        // so the change is reflected instantly everywhere in the app
        await updateSubscription(selected);
      }
      // After selecting a plan — route appropriately
      if (selected === "monthly" || selected === "premium_plus" || selected === "session") {
        nav("/stylists");
      } else {
        nav("/home");
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          <em>closet</em><span>mingle</span>
        </div>
      </div>
      <div className="body">

        {/* ── Stylist plans ── */}
        {isStylist ? (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Your Stylist Plan</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Choose how you want to be billed. You keep 70% of every session fee.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--bg-card)", border: `2px solid ${userProfile?.stylistPlan === "monthly" ? "var(--pink)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Monthly</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--pink)" }}>$20</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>per month</div>
                <button
                  onClick={async () => {
                    setLoading("monthly");
                    try {
                      const { doc, updateDoc } = await import("firebase/firestore");
                      const { db } = await import("../lib/firebase");
                      await updateDoc(doc(db, "users", currentUser.uid), { stylistPlan: "monthly", subscriptionTier: "stylist" });
                      nav("/stylist");
                    } catch(e) { console.error(e); }
                    setLoading(null);
                  }}
                  disabled={loading === "monthly" || userProfile?.stylistPlan === "monthly"}
                  className="btn-pink btn-sm"
                  style={{ width: "100%", opacity: userProfile?.stylistPlan === "monthly" ? 0.6 : 1 }}
                >
                  {loading === "monthly" ? "..." : userProfile?.stylistPlan === "monthly" ? "Current plan" : "Select"}
                </button>
              </div>
              <div style={{ background: "var(--bg-card)", border: `2px solid ${userProfile?.stylistPlan === "annual" ? "#059669" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 16, textAlign: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#059669", color: "white", fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>SAVE $40</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Annual</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#059669" }}>$200</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>per year</div>
                <button
                  onClick={async () => {
                    setLoading("annual");
                    try {
                      const { doc, updateDoc } = await import("firebase/firestore");
                      const { db } = await import("../lib/firebase");
                      await updateDoc(doc(db, "users", currentUser.uid), { stylistPlan: "annual", subscriptionTier: "stylist" });
                      nav("/stylist");
                    } catch(e) { console.error(e); }
                    setLoading(null);
                  }}
                  disabled={loading === "annual" || userProfile?.stylistPlan === "annual"}
                  style={{ width: "100%", padding: "8px", background: "#059669", border: "none", borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", opacity: userProfile?.stylistPlan === "annual" ? 0.6 : 1 }}
                >
                  {loading === "annual" ? "..." : userProfile?.stylistPlan === "annual" ? "Current plan" : "Select"}
                </button>
              </div>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "12px 14px", fontSize: 13, color: "#065f46" }}>
              You keep <strong>70%</strong> of every session and tip. Closet Mingle keeps 30%.
            </div>
          </div>
        ) : (

          <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Choose your plan</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Upgrade anytime. Cancel anytime.</div>
        </div>

        {PLANS.filter(p => {
          // Hide the session add-on if user already has a paid plan
          const hasPaidPlan = userProfile?.subscriptionTier === "monthly" || userProfile?.subscriptionTier === "premium_plus";
          if (p.id === "session" && hasPaidPlan) return false;
          return true;
        }).map(p => (
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
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
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
          {loading ? <span className="spinner"></span> : selected === "free" ? "Get started free" : "Continue to stylists →"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 10 }}>
          Payments processed securely by Stripe. Cancel anytime.
        </p>
        )} 
      </div>
    </div>
  );
}

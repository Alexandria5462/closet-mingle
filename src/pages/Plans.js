import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const CLIENT_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    badge: null,
    features: [
      "Upload unlimited clothing items",
      "AI outfit suggestions",
      "Swipe and liked items",
      "Watermark on screenshots",
      "6-hour swipe sessions",
    ],
    limitations: [
      "No stylist chat or recommendations",
      "Cannot view stylist profiles or reviews",
    ],
  },
  {
    id: "monthly",
    name: "Premium AI",
    price: "$9.99",
    period: "/mo",
    badge: "Popular",
    features: [
      "Everything in Free",
      "No watermark",
      "Unlimited swipe sessions",
      "Text and photo chat with stylists",
      "View stylist profiles and ratings",
      "Style profile quiz for better matches",
    ],
    limitations: [],
  },
  {
    id: "premium_plus",
    name: "Premium Plus",
    price: "$19.99",
    period: "/mo",
    badge: "Best Value",
    features: [
      "Everything in Premium AI",
      "Video sessions with stylists",
      "Choose your own stylist",
      "7-day outfit history",
      "Priority stylist matching",
    ],
    limitations: [],
  },
  {
    id: "session",
    name: "Book a Stylist",
    price: "Varies",
    period: "",
    badge: "Flexible",
    features: [
      "Pay the stylist's own rate",
      "Monthly or per-session booking",
      "Text and video chat",
      "Rate set by each stylist",
    ],
    limitations: [],
  },
];

export default function Plans() {
  const nav = useNavigate();
  const { currentUser, userProfile, updateSubscription } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [stylistLoading, setStylistLoading] = useState(null);

  const isStylist = userProfile?.accountType === "stylist";

  async function handleSelect() {
    if (!currentUser) { nav("/signup"); return; }
    setLoading(true);
    try {
      await updateSubscription(selected);
      nav(selected === "free" ? "/home" : "/home");
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleStylistPlan(planType) {
    if (!currentUser) return;
    setStylistLoading(planType);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        stylistPlan: planType,
        subscriptionTier: "stylist",
      });
      nav("/stylist");
    } catch (e) { console.error(e); }
    setStylistLoading(null);
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav(isStylist ? "/stylist" : "/home")}>
          <em>closet</em><span>mingle</span>
        </div>
      </div>

      <div className="body">

        {/* ── STYLIST PLANS ─────────────────────────────────── */}
        {isStylist && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Your Stylist Plan</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Choose how you want to be billed
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {/* Monthly */}
              <div style={{
                background: "var(--bg-card)",
                border: `2px solid ${userProfile?.stylistPlan === "monthly" ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 16, textAlign: "center"
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Monthly</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--pink)" }}>$20</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>per month</div>
                <button
                  onClick={() => handleStylistPlan("monthly")}
                  disabled={stylistLoading === "monthly" || userProfile?.stylistPlan === "monthly"}
                  className="btn-pink btn-sm"
                  style={{ width: "100%" }}
                >
                  {stylistLoading === "monthly" ? "..." : userProfile?.stylistPlan === "monthly" ? "Current plan" : "Select"}
                </button>
              </div>

              {/* Annual */}
              <div style={{
                background: "var(--bg-card)",
                border: `2px solid ${userProfile?.stylistPlan === "annual" ? "#059669" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 16, textAlign: "center", position: "relative"
              }}>
                <div style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: "#059669", color: "white", fontSize: 10, fontWeight: 600,
                  padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap"
                }}>SAVE $40</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Annual</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#059669" }}>$200</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>per year</div>
                <button
                  onClick={() => handleStylistPlan("annual")}
                  disabled={stylistLoading === "annual" || userProfile?.stylistPlan === "annual"}
                  style={{
                    width: "100%", padding: "8px", background: "#059669", border: "none",
                    borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer",
                    fontSize: 13, fontWeight: 500, fontFamily: "inherit"
                  }}
                >
                  {stylistLoading === "annual" ? "..." : userProfile?.stylistPlan === "annual" ? "Current plan" : "Select"}
                </button>
              </div>
            </div>

            <div style={{
              background: "#f0fdf4", border: "1px solid #6ee7b7",
              borderRadius: "var(--radius)", padding: "12px 14px",
              fontSize: 13, color: "#065f46", marginBottom: 16, lineHeight: 1.6,
            }}>
              💝 <strong>You keep 100% of all tips</strong> from clients<br />
              💰 <strong>You keep 80%</strong> of every booking — you set your own rates<br />
              📱 Your monthly plan gives you full platform access and unlimited clients
            </div>
          </div>
        )}

        {/* ── CLIENT PLANS ──────────────────────────────────── */}
        {!isStylist && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Choose your plan</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Upgrade anytime. Cancel anytime.</div>
            </div>

            {CLIENT_PLANS.filter(p => {
              const hasPaidPlan = userProfile?.subscriptionTier === "monthly" || userProfile?.subscriptionTier === "premium_plus";
              if (p.id === "session" && hasPaidPlan) return false;
              return true;
            }).map(p => (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  background: "var(--bg-card)",
                  border: `2px solid ${selected === p.id ? "var(--pink)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                  cursor: "pointer", position: "relative", transition: "all 0.15s",
                }}
              >
                {p.badge && (
                  <div style={{
                    position: "absolute", top: -10, right: 14,
                    background: "var(--pink)", color: "white", fontSize: 10,
                    fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                  }}>{p.badge}</div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--pink)" }}>{p.price}</span>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{p.period}</span>
                  </div>
                </div>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 3 }}>
                    <i className="ti ti-check" style={{ color: "var(--success)", flexShrink: 0, fontSize: 13 }} aria-hidden="true"></i>
                    {f}
                  </div>
                ))}
                {p.limitations.map(f => (
                  <div key={f} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-tertiary)", marginBottom: 3 }}>
                    <i className="ti ti-x" style={{ flexShrink: 0, fontSize: 13 }} aria-hidden="true"></i>
                    {f}
                  </div>
                ))}
              </div>
            ))}

            <button
              className="btn-pink"
              onClick={handleSelect}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <span className="spinner"></span> : selected === "free" ? "Get started free" : "Continue →"}
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 10 }}>
              Payments processed securely by Stripe. Cancel anytime.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

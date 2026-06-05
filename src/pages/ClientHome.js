import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import TabBar from "../components/TabBar";

function getTierInfo(tier) {
  switch (tier) {
    case "monthly": return { isPaid: true, hasStylist: true, hasVideo: false, canChoose: false, label: "Premium AI", color: "var(--pink-light)" };
    case "premium_plus": return { isPaid: true, hasStylist: true, hasVideo: true, canChoose: true, label: "Premium Plus", color: "#ede9fe" };
    case "session": return { isPaid: true, hasStylist: true, hasVideo: true, canChoose: false, label: "Pay Per Session", color: "#f0fdf4" };
    default: return { isPaid: false, hasStylist: false, hasVideo: false, canChoose: false, label: "Free", color: "var(--bg)" };
  }
}

export default function ClientHome() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [closetCount, setClosetCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const firstName = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const tier = getTierInfo(userProfile?.subscriptionTier);

  useEffect(() => {
    if (!userProfile?.uid) return;
    async function fetchStats() {
      try {
        const cSnap = await getDocs(query(collection(db, "closetItems"), where("userId", "==", userProfile.uid)));
        setClosetCount(cSnap.size);
        const now = new Date();
        const oSnap = await getDocs(query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid)));
        const valid = oSnap.docs.filter(d => { const data = d.data(); return !data.expiresAt || new Date(data.expiresAt) > now; });
        setSavedCount(valid.length);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchStats();
  }, [userProfile]);

  // Progress indicator for new users
  const MILESTONES = [
    { label: "Upload 1 item", done: closetCount >= 1 },
    { label: "Upload 5 items", done: closetCount >= 5 },
    { label: "Like items & generate an outfit", done: savedCount >= 1 },
    { label: "Upgrade to chat with a stylist", done: tier.hasStylist },
  ];
  const completedMilestones = MILESTONES.filter(m => m.done).length;
  const showProgress = completedMilestones < MILESTONES.length;

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tier.isPaid && <span className="badge" style={{ background: tier.color, color: "var(--pink-dark)", fontSize: 10 }}>{tier.label}</span>}
          <div className="avatar" style={{ background: "var(--pink-light)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer" }} onClick={() => nav("/account")}>
            {userProfile?.photoUrl
              ? <img src={userProfile.photoUrl} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
            }
          </div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{greeting}, {firstName}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>What are we wearing today?</div>

          {/* Progress indicator for new users */}
          {showProgress && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Getting started</div>
                <div style={{ fontSize: 12, color: "var(--pink)" }}>{completedMilestones}/{MILESTONES.length}</div>
              </div>
              <div style={{ background: "var(--border)", borderRadius: 10, height: 5, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ background: "var(--pink)", height: "100%", width: `${(completedMilestones / MILESTONES.length) * 100}%`, borderRadius: 10, transition: "width 0.5s ease" }} />
              </div>
              {MILESTONES.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <i className={`ti ${m.done ? "ti-circle-check" : "ti-circle"}`} style={{ color: m.done ? "var(--success)" : "var(--border)", fontSize: 16, flexShrink: 0 }} aria-hidden="true"></i>
                  <span style={{ fontSize: 12, color: m.done ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: m.done ? "line-through" : "none" }}>{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="stat-card"><div className="stat-label">Closet items</div><div className="stat-val">{closetCount}</div></div>
            <div className="stat-card"><div className="stat-label">Saved outfits</div><div className="stat-val">{savedCount}</div></div>
            <div className="stat-card"><div className="stat-label">Sessions</div><div className="stat-val">{tier.hasStylist ? "∞" : "0"}</div></div>
          </div>

          {/* My Closet */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/closet")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>My Closet</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{closetCount} items · Tap to manage</div>
              </div>
              <i className="ti ti-hanger" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          {/* AI Outfit Builder */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/outfits")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>AI Outfit Builder</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Swipe to build outfits from your closet</div>
              </div>
              <i className="ti ti-sparkles" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          {/* Saved Outfits */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/saved")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Saved Outfits</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {savedCount > 0 ? `${savedCount} outfit${savedCount !== 1 ? "s" : ""} saved` : "No saved outfits yet"}
                </div>
              </div>
              <i className="ti ti-heart" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          {/* Talk to a Stylist */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => tier.hasStylist ? nav("/stylists") : nav("/plans")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Talk to a Stylist</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {tier.hasStylist ? tier.canChoose ? "Choose your own personal stylist" : "Live stylists available now" : "Upgrade to chat with live stylists"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {tier.hasStylist ? (<><span className="online-dot"></span><span style={{ fontSize: 11, color: "var(--success)" }}>Live</span></>) : (<span className="badge badge-pink">Upgrade</span>)}
                <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)", marginLeft: 4 }} aria-hidden="true"></i>
              </div>
            </div>
          </div>

          {/* Video badge */}
          {tier.hasVideo && (
            <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 12, color: "#5b21b6", display: "flex", gap: 8, alignItems: "center" }}>
              <i className="ti ti-video" aria-hidden="true"></i>
              <span>Your plan includes <strong>video calls</strong> with stylists</span>
            </div>
          )}
        </div>
      </div>

      <TabBar active="home" type="client" />
    </>
  );
}

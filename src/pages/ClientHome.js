import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import TabBar from "../components/TabBar";

function getTierInfo(tier) {
  const isPremium = ["monthly", "premium_plus", "session"].includes(tier);
  return isPremium
    ? { isPaid: true,  hasStylist: true,  label: "Premium", color: "var(--pink-light)" }
    : { isPaid: false, hasStylist: false, label: "Free",    color: "var(--bg)" };
}

export default function ClientHome() {
  const nav = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [closetCount, setClosetCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [topsCount, setTopsCount] = useState(0);
  const [bottomsCount, setBottomsCount] = useState(0);
  const [dressCount, setDressCount] = useState(0);

  const firstName = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const tier = getTierInfo(userProfile?.subscriptionTier);

  useEffect(() => {
    if (!userProfile?.uid || !currentUser?.uid) return;
    async function fetchStats() {
      try {
        const cSnap = await getDocs(query(collection(db, "closetItems"), where("userId", "==", userProfile.uid)));
        const items = cSnap.docs.map(d => d.data());
        setClosetCount(items.length);
        setTopsCount(items.filter(i => i.category === "tops").length);
        setBottomsCount(items.filter(i => i.category === "bottoms").length);
        setDressCount(items.filter(i => i.category === "dresses").length);
        const now = new Date();
        const oSnap = await getDocs(query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid)));
        setSavedCount(oSnap.docs.filter(d => { const data = d.data(); return !data.expiresAt || new Date(data.expiresAt) > now; }).length);
      } catch (e) { console.error(e); }
    }
    fetchStats();

    // Live unread message count — query only this user's conversations
    // (filtering by participants is required so the security rule permits it).
    const unsubMsgs = onSnapshot(
      query(collection(db, "messages"), where("participants", "array-contains", currentUser.uid)),
      (snap) => {
        let unread = 0;
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.senderId !== currentUser.uid && !data.read) unread++;
        });
        setUnreadMsgCount(unread);
      },
      (err) => { console.error("Unread listener error:", err); }
    );

    return () => { unsubMsgs(); };
  }, [currentUser, userProfile]);

  // Progress milestones with specific item guidance
  const MILESTONES = [
    { label: "Upload 1 top item to get started", done: topsCount >= 1, tip: "Go to Closet → Tops" },
    { label: "Upload 1 bottom item or 1 dress", done: bottomsCount >= 1 || dressCount >= 1, tip: "Go to Closet → Bottoms or Dresses" },
    { label: "Upload 5 tops, 5 bottoms or dresses", done: topsCount >= 5 && (bottomsCount >= 5 || dressCount >= 5), tip: "Add more variety for better outfit suggestions" },
    { label: "Add accessories, shoes and outerwear", done: closetCount >= 15, tip: "Completes your full wardrobe" },
    { label: "Generate your first outfit", done: savedCount >= 1, tip: "Like items then tap Generate" },
    { label: "Book a personal stylist", done: tier.hasStylist, tip: tier.hasStylist ? "Browse stylists and book one!" : "Upgrade to unlock stylist bookings" },
  ];
  const completed = MILESTONES.filter(m => m.done).length;
  const [unreadMsgCount, setUnreadMsgCount] = React.useState(0);
  const [guideDismissed, setGuideDismissed] = React.useState(() => {
    try { return localStorage.getItem("cm_guide_dismissed") === "true"; } catch(e) { return false; }
  });
  const showProgress = completed < MILESTONES.length && !guideDismissed;

  function dismissGuide() {
    setGuideDismissed(true);
    try { localStorage.setItem("cm_guide_dismissed", "true"); } catch(e) {}
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => nav("/notifications")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><i className="ti ti-bell" style={{ fontSize: 20 }} aria-hidden="true"></i></button>
          {tier.isPaid && <span className="badge" style={{ background: tier.color, color: "var(--pink-dark)", fontSize: 10 }}>{tier.label}</span>}
          <div className="avatar" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer" }} onClick={() => nav("/account")}>
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

          {/* Progress indicator with specific guidance */}
          {showProgress && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Getting started</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--pink)" }}>{completed}/{MILESTONES.length}</div>
                  <button
                    onClick={dismissGuide}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16, lineHeight: 1, padding: 2 }}
                    title="Dismiss"
                  >✕</button>
                </div>
              </div>
              <div style={{ background: "var(--border)", borderRadius: 10, height: 5, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ background: "var(--pink)", height: "100%", width: `${(completed / MILESTONES.length) * 100}%`, borderRadius: 10, transition: "width 0.5s ease" }} />
              </div>
              {MILESTONES.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <i className={`ti ${m.done ? "ti-circle-check" : "ti-circle"}`} style={{ color: m.done ? "var(--success)" : "var(--border)", fontSize: 16, flexShrink: 0, marginTop: 1 }} aria-hidden="true"></i>
                  <div>
                    <div style={{ fontSize: 12, color: m.done ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: m.done ? "line-through" : "none" }}>{m.label}</div>
                    {!m.done && <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.tip}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="stat-card"><div className="stat-label">Closet items</div><div className="stat-val">{closetCount}</div></div>
            <div className="stat-card"><div className="stat-label">Saved outfits</div><div className="stat-val">{savedCount}</div></div>
            <div className="stat-card" onClick={() => nav("/my-sessions")} style={{ cursor: "pointer", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Sessions</div>
              <div className="stat-val">{tier.hasStylist ? "∞" : "0"}</div>
              <div style={{ fontSize: 9, color: "var(--pink)", marginTop: 2 }}>View all →</div>
            </div>
          </div>

          {/* ── Find a Stylist — prominent card ── */}
          <div
            onClick={() => nav("/find-stylist")}
            style={{ background: "linear-gradient(135deg, var(--pink) 0%, #9d2449 100%)", borderRadius: "var(--radius)", padding: 16, marginBottom: 14, cursor: "pointer", color: "white" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Find a Stylist</div>
                <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.5 }}>
                  {tier.hasStylist
                    ? "Browse stylists matched to your style profile"
                    : "Browse stylists and book one to get started"
                  }
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }}></span>
                <i className="ti ti-arrow-right" style={{ fontSize: 18 }} aria-hidden="true"></i>
              </div>
            </div>
          </div>

          {/* My Messages */}
          <div
            onClick={() => nav("/my-messages")}
            style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--avatar-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-message-circle" style={{ fontSize: 18, color: "var(--pink)" }} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>My Messages</div>
                    {unreadMsgCount > 0 && (
                      <span style={{ background: "#e53935", color: "white", borderRadius: "50%", minWidth: 20, height: 20, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                        {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>Conversations with your stylists</div>
                </div>
              </div>
              <i className="ti ti-arrow-right" style={{ fontSize: 18, color: "var(--text-tertiary)" }} aria-hidden="true"></i>
            </div>
          </div>

          {/* Following */}
          <div
            onClick={() => nav("/following")}
            style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 14, cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--avatar-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-heart" style={{ fontSize: 18, color: "var(--pink)" }} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Following</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>Stylists you follow</div>
                </div>
              </div>
              <i className="ti ti-arrow-right" style={{ fontSize: 18, color: "var(--text-tertiary)" }} aria-hidden="true"></i>
            </div>
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

          {/* Outfit Builder */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/outfits")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Outfit Builder</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Swipe items to discover outfit ideas</div>
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

          {/* Video badge for premium plus */}
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

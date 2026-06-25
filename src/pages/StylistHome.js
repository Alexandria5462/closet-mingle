import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";

export default function StylistHome() {
  const nav = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [recentConvs, setRecentConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ sessions: 0, earnings: 0, unread: 0, followers: 0 });
  const [liveRating, setLiveRating] = useState(null);
  const [availability, setAvailability] = useState(userProfile?.availabilityEnabled || false);
  // Keep session earnings and tip earnings separate so they don't overwrite each other
  const sessionEarningsRef = useRef(0);
  const tipEarningsRef = useRef(0);

  const firstName = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (userProfile) setAvailability(userProfile.availabilityEnabled || false);
  }, [userProfile]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // ── Live unread messages ───────────────────────────────────
    const unsubMsgs = onSnapshot(
      query(collection(db, "messages"), where("participants", "array-contains", currentUser.uid)),
      (snap) => {
        const unread = snap.docs.filter(d => {
          const data = d.data();
          return data.senderId !== currentUser.uid && !data.read;
        }).length;
        setTodayStats(prev => ({ ...prev, unread }));

        // Also update recent conversations
        const convMap = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (!convMap[data.conversationId] || new Date(data.createdAt) > new Date(convMap[data.conversationId].createdAt)) {
            convMap[data.conversationId] = data;
          }
        });
        const sorted = Object.values(convMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
        // Load client profiles async without blocking
        Promise.all(sorted.map(async msg => {
          const parts = (msg.conversationId || "").split("_");
          const clientId = parts.find(id => id !== currentUser.uid) || "";
          try {
            const s = await getDocs(query(collection(db, "users"), where("__name__", "==", clientId)));
            return { msg, client: !s.empty ? s.docs[0].data() : null, clientId };
          } catch(e) { return { msg, client: null, clientId }; }
        })).then(setRecentConvs);
      },
      (err) => {
        if (err?.code !== "permission-denied") console.error("Unread listener error:", err);
      }
    );

    // ── Live today's active conversations ────────────────────
    // A "session" = unique client the stylist sent at least one message to today
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const unsubSessions = onSnapshot(
      query(collection(db, "messages"), where("participants", "array-contains", currentUser.uid)),
      (snap) => {
        const clientsToday = new Set();
        snap.docs.forEach(d => {
          const data = d.data();
          const convId = data.conversationId || "";
          if (data.senderId !== currentUser.uid) return; // only messages stylist sent
          if ((data.createdAt || "") < todayStart) return; // only today
          const parts = convId.split("_");
          const clientId = parts.find(id => id !== currentUser.uid);
          if (clientId) clientsToday.add(clientId);
        });
        setTodayStats(prev => ({ ...prev, sessions: clientsToday.size }));
      },
      (err) => {
        if (err?.code !== "permission-denied") console.error("Sessions listener error:", err);
      }
    );

    // ── Live today's tips (100% goes to stylist) ──────────────
    const unsubTips = onSnapshot(
      query(collection(db, "tips"), where("toStylistId", "==", currentUser.uid)),
      (snap) => {
        // Tips: stylist keeps 100%
        tipEarningsRef.current = snap.docs
          .filter(d => (d.data().createdAt || "") > todayStart)
          .reduce((sum, d) => sum + (d.data().stylistAmount || d.data().amount || 0), 0);

        // Session fees: stylist keeps 80% of their own session rate
        sessionEarningsRef.current = snap.docs
          .filter(d => {
            const data = d.data();
            return (data.endedAt || "") > todayStart && data.stylistEarned > 0;
          })
          .reduce((sum, d) => sum + (d.data().stylistEarned || 0), 0);

        setTodayStats(prev => ({
          ...prev,
          earnings: tipEarningsRef.current + sessionEarningsRef.current,
        }));
      }
    );

    // ── Live session fee earnings (from completed bookings) ───
    const unsubSessionFees = onSnapshot(
      query(collection(db, "chatSessions"),
        where("stylistId", "==", currentUser.uid),
        where("status", "==", "ended")
      ),
      (snap) => {
        // Use stylistEarned field written at End Session time (80% of their rate)
        sessionEarningsRef.current = snap.docs
          .filter(d => (d.data().endedAt || "") > todayStart)
          .reduce((sum, d) => sum + (d.data().stylistEarned || 0), 0);
        setTodayStats(prev => ({
          ...prev,
          earnings: tipEarningsRef.current + sessionEarningsRef.current,
        }));
      }
    );

    // ── Live rating from reviews ──────────────────────────────
    const unsubReviews = onSnapshot(
      query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid)),
      (snap) => {
        const reviews = snap.docs.map(d => d.data());
        const avg = reviews.length > 0
          ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
          : null;
        setLiveRating(avg);
      }
    );

    // ── Live followers ────────────────────────────────────────
    const unsubFollowers = onSnapshot(
      query(collection(db, "follows"), where("stylistId", "==", currentUser.uid)),
      (snap) => {
        setTodayStats(prev => ({ ...prev, followers: snap.size }));
      }
    );

    setLoading(false);

    return () => {
      unsubMsgs();
      unsubSessions();
      unsubTips();
      unsubSessionFees();
      unsubReviews();
      unsubFollowers();
    };
  }, [currentUser]);

  async function toggleAvailability() {
    const newVal = !availability;
    setAvailability(newVal);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { availabilityEnabled: newVal });
    } catch (e) { console.error(e); }
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}>
          <em>closet</em><span>mingle</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => nav("/notifications")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
            <i className="ti ti-bell" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="avatar" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer" }} onClick={() => nav("/account")}>
            {userProfile?.photoUrl
              ? <img src={userProfile.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
            }
          </div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{greeting}, {firstName} </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            {availability ? "You are live — clients can see and message you" : "You appear offline — clients can still message you"}
          </div>

          {/* Quick availability toggle */}
          <div style={{ background: availability ? "#d1fae5" : "var(--bg-card)", border: `0.5px solid ${availability ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: availability ? "#065f46" : "var(--text-primary)" }}>
                {availability ? "Available for sessions" : "Not available"}
              </div>
              <div style={{ fontSize: 12, color: availability ? "#065f46" : "var(--text-secondary)", marginTop: 2, opacity: 0.8 }}>
                {availability ? userProfile?.availabilityHours || "Open now" : "You appear as offline"}
              </div>
            </div>
            <button
              onClick={toggleAvailability}
              style={{ background: availability ? "#059669" : "#d1d5db", border: "none", borderRadius: 20, width: 44, height: 24, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
            >
              <div style={{ position: "absolute", top: 2, left: availability ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
            </button>
          </div>

          {/* Today's stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Clients helped", value: todayStats.sessions, sub: "today" },
              { label: "Tips earned",    value: `$${(tipEarningsRef.current || 0).toFixed(2)}`, sub: "today · 100% yours" },
              { label: "Session fees",   value: `$${(sessionEarningsRef.current || 0).toFixed(2)}`, sub: "today · from bookings" },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Quick nav cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Messages", sub: `${todayStats.unread} unread`, icon: "ti-message-circle", path: "/stylist/messages", color: "var(--card-pink)", badge: todayStats.unread },
              { label: "My Clients", sub: "View all", icon: "ti-users", path: "/stylist/clients", color: "var(--card-blue)" },
              { label: "Analytics", sub: "Earnings & stats", icon: "ti-chart-bar", path: "/stylist/analytics", color: "var(--card-green)" },
              { label: "My Profile", sub: "Edit & settings", icon: "ti-user", path: "/account", color: "var(--card-purple)" },
            ].map(card => (
              <div key={card.label} onClick={() => nav(card.path)} style={{
                background: card.color, borderRadius: "var(--radius)", padding: 14,
                cursor: "pointer", position: "relative",
                border: "0.5px solid var(--border)",
              }}>
                {card.badge > 0 && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "var(--pink)", borderRadius: "50%", width: 18, height: 18, fontSize: 10, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                    {card.badge}
                  </div>
                )}
                <i className={`ti ${card.icon}`} style={{ fontSize: 22, color: card.accent || "var(--pink)", marginBottom: 6, display: "block" }} aria-hidden="true"></i>
                <div style={{ fontSize: 13, fontWeight: 600, color: card.textColor || "var(--text-primary)" }}>{card.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Stylist matching visibility ── */}
          <div className="card" style={{ marginBottom: 14, cursor: "pointer" }} onClick={() => nav("/find-stylist")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Find a Client</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  See how clients can discover your profile
                </div>
              </div>
              <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
            </div>
          </div>

          {/* ── Visibility status ── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Your visibility to clients</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: availability ? "#d1fae5" : "var(--bg)", border: `1px solid ${availability ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{availability ? "🟢" : "⚫"}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: availability ? "#065f46" : "var(--text-tertiary)" }}>
                  {availability ? "Online" : "Offline"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>Availability status</div>
              </div>
              <div style={{ flex: 1, background: userProfile?.isVerified ? "#d1fae5" : "var(--bg)", border: `1px solid ${userProfile?.isVerified ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{userProfile?.isVerified ? "✅" : "⏳"}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: userProfile?.isVerified ? "#065f46" : "var(--text-tertiary)" }}>
                  {userProfile?.isVerified ? "Verified" : "Pending"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>Verified badge</div>
              </div>
              <div style={{ flex: 1, background: (liveRating > 0) ? "#fef3c7" : "var(--bg)", border: `1px solid ${liveRating > 0 ? "#fcd34d" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>⭐</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: liveRating > 0 ? "#92400e" : "var(--text-tertiary)" }}>
                  {liveRating ? liveRating : "—"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>Avg rating</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, textAlign: "center" }}>
              {availability
                ? "Clients can see you are online and message you"
                : "Clients can still view your profile and message you while offline"
              }
            </div>
          </div>

          {/* Recent conversations */}
          <div className="section-label">Recent conversations</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>Loading...</div>
          ) : recentConvs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 20px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>No recent conversations</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Turn on availability to start receiving clients</div>
            </div>
          ) : recentConvs.map((c, i) => (
            <div key={i} onClick={() => nav(`/stylist/chat/${c.clientId}`)} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <div className="avatar" style={{ width: 40, height: 40, background: "var(--avatar-bg)", color: "var(--pink-dark)", fontSize: 13, overflow: "hidden", flexShrink: 0 }}>
                {c.client?.photoUrl
                  ? <img src={c.client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : c.client?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.client?.name || "Client"}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.msg.type === "image" ? "📷 Photo" : c.msg.type === "video_invite" ? "📹 Video call" : c.msg.content}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>{getTimeAgo(c.msg.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" type="stylist" />
    </>
  );
}

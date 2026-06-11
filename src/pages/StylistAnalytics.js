import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonCard } from "../components/SkeletonLoader";

export default function StylistAnalytics() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // ── Live sessions listener ─────────────────────────────────
    // Sessions = unique clients the stylist has ever messaged
    // Only "Try a Session" (session tier) clients generate a session fee (70% of $9.99)
    const unsubSessions = onSnapshot(
      query(collection(db, "chatSessions"),
        where("stylistId", "==", currentUser.uid)
      ),
      (sessionSnap) => {
        const sessions = sessionSnap.docs.map(d => d.data());
        const totalClients = new Set(sessions.map(s => s.clientId)).size;

        // Session earnings — use actual stylistEarned stored at End Session (80% of stylist's rate)
        const completedSessionFees = sessions.filter(s => s.status === "ended" && s.stylistEarned > 0);
        const sessionFeeEarnings = completedSessionFees.reduce((sum, s) => sum + (s.stylistEarned || 0), 0);

        // Monthly breakdown using actual earnings
        const monthly = {};
        sessions.forEach(s => {
          const month = new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!monthly[month]) monthly[month] = { sessions: 0, earnings: 0 };
          monthly[month].sessions++;
          if (s.status === "ended" && s.stylistEarned > 0) {
            monthly[month].earnings += s.stylistEarned || 0;
          }
        });
        setMonthlyData(Object.entries(monthly).map(([month, data]) => ({ month, ...data })).slice(-6));

        setStats(prev => ({ ...(prev || {}), totalClients, sessionFeeEarnings, completedSessions: completedSessionFees.length }));
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );

    // Live tips listener — stylist keeps 100% of tips
    const unsubTips = onSnapshot(
      query(collection(db, "tips"), where("toStylistId", "==", currentUser.uid)),
      (tipSnap) => {
        const tips = tipSnap.docs.map(d => d.data());
        // stylistAmount is always 100% of tip (full amount)
        const totalTips = tips.reduce((s, t) => s + (t.stylistAmount || t.amount || 0), 0);
        const totalTipCount = tips.length;
        setStats(prev => ({
          ...(prev || {}),
          totalTips,
          totalTipCount,
          // Total earnings = 100% of all tips + 70% of session fees
          totalEarnings: totalTips + (prev?.sessionFeeEarnings || 0),
        }));
      }
    );

    // Live reviews listener
    const unsubReviews = onSnapshot(
      query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid)),
      (reviewSnap) => {
        const reviews = reviewSnap.docs.map(d => d.data());
        const avgRating = reviews.length > 0
          ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
          : 0;
        const reviewCount = reviews.length;
        setStats(prev => ({ ...(prev || {}), avgRating, reviewCount }));
      }
    );

    // Live followers listener
    const unsubFollowers = onSnapshot(
      query(collection(db, "follows"), where("stylistId", "==", currentUser.uid)),
      (followSnap) => {
        setStats(prev => ({ ...(prev || {}), followerCount: followSnap.size }));
      }
    );

    return () => {
      unsubSessions();
      unsubTips();
      unsubReviews();
      unsubFollowers();
    };
  }, [currentUser]);

  const hasData = stats && (stats.totalClients > 0 || stats.reviewCount > 0 || stats.totalTipCount > 0);
  const maxEarnings = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.earnings)) : 1;

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}>
          <em>closet</em><span>mingle</span>
        </div>
        <span className="badge badge-pink">Analytics</span>
      </div>

      <div className="screen">
        <div className="body">

          {loading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={5} />
            </>
          ) : !hasData ? (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Start styling to see your work pay off</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto 24px" }}>
                Complete sessions with clients and your earnings, ratings and session history will show up here
              </div>
              <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "14px 16px", fontSize: 13, color: "var(--pink-dark)", textAlign: "left" }}>
                <strong>Tip:</strong> Turn on your availability in your Profile tab so clients can find you!
              </div>
            </div>
          ) : (
            <>
              {/* Revenue highlight */}
              <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: 16, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--pink-dark)", marginBottom: 4, fontWeight: 500 }}>Total earned</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "var(--pink-dark)" }}>
                  ${((stats.totalTips || 0) + (stats.sessionFeeEarnings || 0)).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "var(--pink-dark)", opacity: 0.8, marginTop: 4 }}>
                  Tips (100%) · Session fees (70% of $9.99)
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Total clients",        value: stats.totalClients ?? 0,       icon: "👥" },
                  { label: "Avg Rating",            value: stats.avgRating > 0 ? `${stats.avgRating} ⭐` : "—", icon: "⭐" },
                  { label: "Total Reviews",         value: stats.reviewCount ?? 0,        icon: "📝" },
                  { label: "Tips received",         value: stats.totalTipCount ?? 0,      icon: "💝" },
                  { label: "Total tips earned",     value: `$${(stats.totalTips || 0).toFixed(2)}`, icon: "💰" },
                  { label: "Session fees earned",   value: `$${(stats.sessionFeeEarnings || 0).toFixed(2)}`, icon: "🎯" },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Monthly earnings chart */}
              {monthlyData.length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Monthly earnings</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                    {monthlyData.map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>${m.earnings.toFixed(0)}</div>
                        <div style={{
                          width: "100%", borderRadius: "4px 4px 0 0",
                          height: `${Math.max(8, (m.earnings / maxEarnings) * 90)}px`,
                          background: i === monthlyData.length - 1 ? "var(--pink)" : "var(--pink-light)",
                          border: `1px solid ${i === monthlyData.length - 1 ? "var(--pink-dark)" : "#f4c0d1"}`,
                        }} />
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)", textAlign: "center" }}>{m.month.split(" ")[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue split reminder */}
              <div className="card">
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  💝 <strong style={{ color: "var(--success)" }}>Tips — 100% yours.</strong> Every tip a client sends goes directly to you.<br />
                  🎯 <strong style={{ color: "var(--pink-dark)" }}>Session fees — 70% yours.</strong> For Pay Per Session clients ($9.99), you earn $6.93. ClosetMingle keeps 30%.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <TabBar active="analytics" type="stylist" />
    </>
  );
}

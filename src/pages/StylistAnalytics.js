import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
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
    if (currentUser?.uid) loadAnalytics();
  }, [currentUser]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Reviews
      const reviewSnap = await getDocs(
        query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid))
      );
      const reviews = reviewSnap.docs.map(d => d.data());
      const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

      // Sessions
      const sessionSnap = await getDocs(
        query(collection(db, "chatSessions"),
          where("stylistId", "==", currentUser.uid),
          where("status", "==", "ended")
        )
      );
      const sessions = sessionSnap.docs.map(d => d.data());
      const totalSessions = sessions.length;
      const totalEarnings = totalSessions * 9.99 * 0.7;
      const totalRevenue = totalSessions * 9.99;

      // Tips
      const tipSnap = await getDocs(
        query(collection(db, "tips"), where("toStylistId", "==", currentUser.uid))
      );
      const tips = tipSnap.docs.map(d => d.data());
      const totalTips = tips.reduce((s, t) => s + (t.stylistAmount || 0), 0);

      // Build monthly breakdown
      const monthly = {};
      sessions.forEach(s => {
        const month = new Date(s.endedAt || s.startedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        if (!monthly[month]) monthly[month] = { sessions: 0, earnings: 0 };
        monthly[month].sessions++;
        monthly[month].earnings += 9.99 * 0.7;
      });

      const monthlyArr = Object.entries(monthly).map(([month, data]) => ({ month, ...data })).slice(-6);
      setMonthlyData(monthlyArr);

      // Completion rate
      const allSessionSnap = await getDocs(
        query(collection(db, "chatSessions"), where("stylistId", "==", currentUser.uid))
      );
      const completionRate = allSessionSnap.size > 0
        ? Math.round((totalSessions / allSessionSnap.size) * 100)
        : 0;

      setStats({
        totalSessions,
        totalEarnings: totalEarnings + totalTips,
        totalRevenue,
        totalTips,
        avgRating,
        totalReviews: reviews.length,
        completionRate,
      });
    } catch (e) {
      console.error("Analytics error:", e);
    }
    setLoading(false);
  }

  const hasData = stats && (stats.totalSessions > 0 || stats.totalReviews > 0);
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
              <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "14px 16px", fontSize: 13, color: "var(--pink-dark)", textAlign: "left" }}>
                💡 <strong>Tip:</strong> Turn on your availability in your Profile tab so clients can find you!
              </div>
            </div>
          ) : (
            <>
              {/* Revenue highlight */}
              <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: 16, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--pink-dark)", marginBottom: 4, fontWeight: 500 }}>Total earned</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "var(--pink-dark)" }}>
                  ${stats.totalEarnings.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "var(--pink-dark)", opacity: 0.7 }}>
                  Your 70% share · Platform revenue: ${stats.totalRevenue.toFixed(2)}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Total Sessions", value: stats.totalSessions, icon: "💬" },
                  { label: "Avg Rating", value: stats.avgRating > 0 ? `${stats.avgRating} ⭐` : "—", icon: "⭐" },
                  { label: "Total Reviews", value: stats.totalReviews, icon: "📝" },
                  { label: "Completion Rate", value: `${stats.completionRate}%`, icon: "✅" },
                  { label: "Tips Earned", value: `$${stats.totalTips.toFixed(2)}`, icon: "💝" },
                  { label: "Avg Per Session", value: stats.totalSessions > 0 ? `$${(stats.totalEarnings / stats.totalSessions).toFixed(2)}` : "—", icon: "💰" },
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
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  💰 You keep <strong style={{ color: "var(--success)" }}>70%</strong> of every session fee and <strong style={{ color: "var(--success)" }}>70%</strong> of every tip. Closet Mingle keeps 30%.
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

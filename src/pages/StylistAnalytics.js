import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonCard } from "../components/SkeletonLoader";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 30) return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function Stars({ rating }) {
  return (
    <span style={{ color: "#c4745a", letterSpacing: 1 }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

export default function StylistAnalytics() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [tips,        setTips]        = useState([]);
  const [reviews,     setReviews]     = useState([]);
  const [expanded,    setExpanded]    = useState(null); // "sessions" | "reviews" | "tips"

  useEffect(() => {
    if (!currentUser?.uid) return;

    // ── Sessions live listener ──────────────────────────────────
    const unsubSessions = onSnapshot(
      query(collection(db, "chatSessions"), where("stylistId", "==", currentUser.uid)),
      async (snap) => {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Load client names for display
        const withNames = await Promise.all(raw.map(async s => {
          if (s.clientName) return s;
          try {
            const u = await getDoc(doc(db, "users", s.clientId));
            return { ...s, clientName: u.exists() ? u.data().name : "Client" };
          } catch(e) { return { ...s, clientName: "Client" }; }
        }));
        setSessions(withNames.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));

        const totalClients       = new Set(raw.map(s => s.clientId)).size;
        const completed          = raw.filter(s => s.status === "ended");
        const completedSessions  = completed.length;
        const sessionFeeEarnings = completed.reduce((sum, s) => sum + (s.stylistEarned || 0), 0);

        // Monthly breakdown — sessions only here, tips added by tip listener
        const monthly = {};
        raw.forEach(s => {
          const month = new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!monthly[month]) monthly[month] = { sessions: 0, earnings: 0, tipEarnings: 0 };
          monthly[month].sessions++;
          if (s.status === "ended") monthly[month].earnings += s.stylistEarned || 0;
        });
        // Store base monthly so tip listener can merge into it
        setMonthlyData(prev => {
          const merged = { ...monthly };
          // Preserve any tip earnings already added by tip listener
          prev.forEach(m => {
            if (merged[m.month]) merged[m.month].tipEarnings = m.tipEarnings || 0;
          });
          return Object.entries(merged)
            .map(([month, data]) => ({ month, ...data, total: (data.earnings || 0) + (data.tipEarnings || 0) }))
            .slice(-6);
        });
        setStats(prev => ({ ...(prev || {}), totalClients, sessionFeeEarnings, completedSessions }));
        setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );

    // ── Tips live listener ──────────────────────────────────────
    const unsubTips = onSnapshot(
      query(collection(db, "tips"), where("toStylistId", "==", currentUser.uid)),
      snap => {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTips(raw);
        const totalTips = raw.reduce((s, t) => s + (t.stylistAmount || t.amount || 0), 0);
        setStats(prev => ({ ...(prev || {}), totalTips, totalTipCount: raw.length }));

        // Merge tip earnings into monthly chart
        const tipsByMonth = {};
        raw.forEach(t => {
          if (!t.createdAt) return;
          const month = new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!tipsByMonth[month]) tipsByMonth[month] = 0;
          tipsByMonth[month] += t.stylistAmount || t.amount || 0;
        });
        setMonthlyData(prev => prev.map(m => ({
          ...m,
          tipEarnings: tipsByMonth[m.month] || 0,
          total: (m.earnings || 0) + (tipsByMonth[m.month] || 0),
        })));
      }
    );

    // ── Reviews live listener ───────────────────────────────────
    const unsubReviews = onSnapshot(
      query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid)),
      snap => {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReviews(raw);
        const avg = raw.length > 0
          ? (raw.reduce((s, r) => s + r.rating, 0) / raw.length).toFixed(1)
          : 0;
        setStats(prev => ({ ...(prev || {}), avgRating: avg, reviewCount: raw.length }));
      }
    );

    // ── Followers live listener ─────────────────────────────────
    const unsubFollowers = onSnapshot(
      query(collection(db, "follows"), where("stylistId", "==", currentUser.uid)),
      snap => setStats(prev => ({ ...(prev || {}), followerCount: snap.size }))
    );

    return () => { unsubSessions(); unsubTips(); unsubReviews(); unsubFollowers(); };
  }, [currentUser]);

  const hasData    = stats && (stats.totalClients > 0 || stats.reviewCount > 0 || stats.totalTipCount > 0);
  const toggle     = (panel) => setExpanded(prev => prev === panel ? null : panel);

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}>
          <em>closet</em><span>mingle</span>
        </div>
        <span className="badge badge-pink">Analytics</span>
      </div>

      <div className="screen"><div className="body">

        {loading ? (
          <><SkeletonCard lines={3} /><SkeletonCard lines={3} /><SkeletonCard lines={5} /></>
        ) : !hasData ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <i className="ti ti-chart-bar" style={{ fontSize: 64, color: "var(--text-tertiary)", display: "block", marginBottom: 16 }} aria-hidden="true"></i>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No data yet</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto 24px" }}>
              Start working with clients and your earnings, ratings and session history will appear here.
            </div>
            <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "14px 16px", fontSize: 13, color: "var(--pink-dark)" }}>
              <strong>Tip:</strong> Set your rates and availability in Account to start receiving bookings.
            </div>
          </div>
        ) : (
          <>
            {/* ── Total earned highlight ── */}
            <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: 16, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--pink-dark)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Total earned</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "var(--pink-dark)" }}>
                ${((stats.totalTips || 0) + (stats.sessionFeeEarnings || 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: "var(--pink-dark)", opacity: 0.7, marginTop: 4 }}>Tips + Booking fees</div>
            </div>

            {/* ── Quick stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Total Overall Clients", value: stats.totalClients  ?? 0 },
                { label: "Followers",             value: stats.followerCount ?? 0 },
                { label: "Reviews",               value: stats.reviewCount   ?? 0 },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── SESSIONS — expandable ── */}
            <div className="card" style={{ marginBottom: 10 }}>
              <button
                onClick={() => toggle("sessions")}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Sessions</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {stats.totalClients ?? 0} clients · <strong style={{ color: "var(--success)" }}>{stats.completedSessions ?? 0} completed</strong> · tap to expand
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--pink-dark)" }}>
                      ${(stats.sessionFeeEarnings || 0).toFixed(2)}
                    </div>
                    <i className={`ti ${expanded === "sessions" ? "ti-chevron-up" : "ti-chevron-down"}`}
                      style={{ color: "var(--text-tertiary)", fontSize: 14 }} aria-hidden="true"></i>
                  </div>
                </div>
              </button>
              {expanded === "sessions" && (
                <div style={{ marginTop: 14, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>
                  {sessions.length === 0
                    ? <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: "12px 0" }}>No sessions yet</div>
                    : sessions.map((s, i) => (
                      <div
                        key={s.id || i}
                        onClick={() => nav(`/stylist/chat/${s.clientId}`)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < sessions.length - 1 ? "0.5px solid var(--border)" : "none", cursor: "pointer" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.clientName || "Client"}</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                            Started {timeAgo(s.startedAt)}{s.endedAt ? ` · Ended ${timeAgo(s.endedAt)}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                          <div style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.status === "active" ? "#d1fae5" : "var(--bg)", color: s.status === "active" ? "#065f46" : "var(--text-tertiary)", border: `1px solid ${s.status === "active" ? "#6ee7b7" : "var(--border)"}` }}>
                            {s.status === "active" ? "Active" : "Completed"}
                          </div>
                          {s.stylistEarned > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginTop: 3 }}>
                              +${s.stylistEarned.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* ── REVIEWS — expandable ── */}
            <div className="card" style={{ marginBottom: 10 }}>
              <button
                onClick={() => toggle("reviews")}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Reviews</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {stats.reviewCount ?? 0} review{stats.reviewCount !== 1 ? "s" : ""} · {stats.avgRating > 0 ? `${stats.avgRating} avg rating` : "No ratings yet"} · tap to expand
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {stats.avgRating > 0 && (
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#92400e" }}>{stats.avgRating} / 5</div>
                    )}
                    <i className={`ti ${expanded === "reviews" ? "ti-chevron-up" : "ti-chevron-down"}`}
                      style={{ color: "var(--text-tertiary)", fontSize: 14 }} aria-hidden="true"></i>
                  </div>
                </div>
              </button>
              {expanded === "reviews" && (
                <div style={{ marginTop: 14, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>
                  {reviews.length === 0
                    ? <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: "12px 0" }}>No reviews yet</div>
                    : reviews.map((r, i) => (
                      <div key={r.id || i} style={{ padding: "12px 0", borderBottom: i < reviews.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.reviewerName || "Client"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Stars rating={r.rating} />
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{timeAgo(r.createdAt)}</span>
                          </div>
                        </div>
                        {r.comment && (
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.comment}</div>
                        )}
                        {r.reply && (
                          <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--pink)", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                            <strong>Your reply:</strong> {r.reply}
                          </div>
                        )}
                      </div>
                    ))
                  }
                  <button
                    onClick={() => nav(`/stylist/${currentUser.uid}`)}
                    style={{ width: "100%", marginTop: 12, padding: "8px", background: "none", border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontFamily: "inherit" }}
                  >
                    View on public profile →
                  </button>
                </div>
              )}
            </div>

            {/* ── TIPS — expandable ── */}
            <div className="card" style={{ marginBottom: 10 }}>
              <button
                onClick={() => toggle("tips")}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Tips</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {stats.totalTipCount ?? 0} tip{stats.totalTipCount !== 1 ? "s" : ""} · 100% yours · tap to expand
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>
                      ${(stats.totalTips || 0).toFixed(2)}
                    </div>
                    <i className={`ti ${expanded === "tips" ? "ti-chevron-up" : "ti-chevron-down"}`}
                      style={{ color: "var(--text-tertiary)", fontSize: 14 }} aria-hidden="true"></i>
                  </div>
                </div>
              </button>
              {expanded === "tips" && (
                <div style={{ marginTop: 14, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>
                  {tips.length === 0
                    ? <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: "12px 0" }}>No tips received yet</div>
                    : (
                      <>
                        {tips.map((t, i) => (
                          <div key={t.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < tips.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.fromUserName || "Client"}</div>
                              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                                {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {timeAgo(t.createdAt)}
                              </div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--success)", flexShrink: 0, marginLeft: 10 }}>
                              +${(t.stylistAmount || t.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {/* Total row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0", borderTop: "0.5px solid var(--border)", marginTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Total received</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>${(stats.totalTips || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )
                  }
                </div>
              )}
            </div>

            {/* ── Monthly chart ── */}
            {monthlyData.length > 0 && (
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Monthly earnings</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                  {monthlyData.map((m, i) => {
                    const barVal = m.total || m.earnings || 0;
                    const maxVal = Math.max(...monthlyData.map(x => x.total || x.earnings || 0), 1);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>${barVal.toFixed(0)}</div>
                        <div style={{ width: "100%", borderRadius: "4px 4px 0 0", height: `${Math.max(8, (barVal / maxVal) * 90)}px`, background: i === monthlyData.length - 1 ? "var(--pink)" : "var(--avatar-bg)", border: `1px solid ${i === monthlyData.length - 1 ? "var(--pink-dark)" : "var(--border)"}` }} />
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)", textAlign: "center" }}>{m.month.split(" ")[0]}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10, color: "var(--text-tertiary)" }}>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--pink)", marginRight: 4 }}></span>Tips</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--avatar-bg)", border: "1px solid var(--border)", marginRight: 4 }}></span>Session fees</span>
                </div>
              </div>
            )}

            {/* ── How earnings work ── */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>How your earnings work</div>
              {[
                { label: "Tips from clients",         value: "100% yours",      color: "var(--success)" },
                { label: "Booking fees (your rate)",  value: "80% yours",       color: "var(--text-primary)" },
                { label: "ClosetMingle platform fee", value: "20% per booking", color: "var(--text-tertiary)" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: i < arr.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                  <strong style={{ color: row.color }}>{row.value}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div></div>
      <TabBar active="analytics" type="stylist" />
    </>
  );
}

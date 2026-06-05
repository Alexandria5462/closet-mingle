import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function ClientSessions() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | completed

  useEffect(() => {
    if (currentUser?.uid) loadSessions();
  }, [currentUser]);

  async function loadSessions() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "chatSessions"), where("clientId", "==", currentUser.uid))
      );
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load stylist info for each session
      const withStylists = await Promise.all(raw.map(async s => {
        try {
          const stylistSnap = await getDoc(doc(db, "users", s.stylistId));
          const stylist = stylistSnap.exists() ? stylistSnap.data() : null;
          return { ...s, stylist };
        } catch (e) { return { ...s, stylist: null }; }
      }));

      setSessions(withStylists.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const filtered = sessions
    .filter(s => filter === "all" || s.status === (filter === "active" ? "active" : "ended"))
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.stylist?.name?.toLowerCase().includes(q) ||
        s.stylist?.username?.toLowerCase().includes(q) ||
        s.stylist?.specialty?.toLowerCase().includes(q);
    });

  const activeSessions = sessions.filter(s => s.status === "active").length;
  const completedSessions = sessions.filter(s => s.status === "ended").length;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav("/home")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
            Closet<span>Mingle</span>
          </div>
        </div>
        <span className="badge badge-pink">{sessions.length} sessions</span>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>My Stylist Sessions</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            All past and present stylists you have worked with
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Active</div>
              <div className="stat-val" style={{ fontSize: 20, color: "var(--success)" }}>{activeSessions}</div>
            </div>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Completed</div>
              <div className="stat-val" style={{ fontSize: 20 }}>{completedSessions}</div>
            </div>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Total</div>
              <div className="stat-val" style={{ fontSize: 20 }}>{sessions.length}</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
            <input
              className="input-field"
              placeholder="Search by stylist name or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, marginBottom: 0 }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["all","active","completed"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid", cursor: "pointer", textTransform: "capitalize",
                background: filter === f ? "var(--pink)" : "var(--bg-card)",
                borderColor: filter === f ? "var(--pink)" : "var(--border)",
                color: filter === f ? "white" : "var(--text-secondary)",
              }}>{f}</button>
            ))}
          </div>

          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {sessions.length === 0 ? "No sessions yet" : "No sessions match your search"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                {sessions.length === 0
                  ? "Find a stylist and start your first session!"
                  : "Try a different search term"
                }
              </div>
              {sessions.length === 0 && (
                <button className="btn-pink" onClick={() => nav("/find-stylist")} style={{ width: "auto", padding: "10px 24px" }}>
                  Find a stylist →
                </button>
              )}
            </div>
          ) : filtered.map(s => (
            <div
              key={s.id}
              onClick={() => nav(`/chat/${s.stylistId}`)}
              style={{ background: "var(--bg-card)", border: `0.5px solid ${s.status === "active" ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className="avatar" style={{ width: 48, height: 48, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 15, overflow: "hidden", flexShrink: 0 }}>
                  {s.stylist?.photoUrl
                    ? <img src={s.stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : s.stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST"
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.stylist?.name || "Stylist"}</div>
                    {s.stylist?.username && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>@{s.stylist.username}</div>}
                    <span style={{
                      fontSize: 9, borderRadius: 10, padding: "1px 8px", fontWeight: 500,
                      background: s.status === "active" ? "#d1fae5" : "var(--bg)",
                      border: `1px solid ${s.status === "active" ? "#6ee7b7" : "var(--border)"}`,
                      color: s.status === "active" ? "#065f46" : "var(--text-tertiary)"
                    }}>
                      {s.status === "active" ? "Active" : "Completed"}
                    </span>
                  </div>
                  {s.stylist?.specialty && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.stylist.specialty}</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                    Started {getTimeAgo(s.startedAt)}
                    {s.endedAt && ` · Ended ${getTimeAgo(s.endedAt)}`}
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)", flexShrink: 0 }} aria-hidden="true"></i>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" type="client" />
    </>
  );
}

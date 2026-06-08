import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function ClientProfile() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { currentUser } = useAuth();

  const [client, setClient] = useState(null);
  const [closetItems, setClosetItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    if (clientId) loadAll();
  }, [clientId]);

  async function loadAll() {
    setLoading(true);
    try {
      // Load client profile
      const clientSnap = await getDoc(doc(db, "users", clientId));
      if (clientSnap.exists()) setClient(clientSnap.data());

      // Load public closet items
      const closetSnap = await getDocs(
        query(collection(db, "closetItems"), where("userId", "==", clientId))
      );
      // Filter privately marked items client-side
      setClosetItems(closetSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => !item.isPrivate));

      // Load session history — query by conversationId as fallback
      const conversationId = [clientId, currentUser.uid].sort().join("_");
      const sessionSnap = await getDocs(
        query(collection(db, "chatSessions"),
          where("conversationId", "==", conversationId)
        )
      );
      // Also try by clientId + stylistId
      const sessionSnap2 = await getDocs(
        query(collection(db, "chatSessions"),
          where("clientId", "==", clientId),
          where("stylistId", "==", currentUser.uid)
        )
      );
      const allSessionIds = new Set();
      const allSessions = [];
      [...sessionSnap.docs, ...sessionSnap2.docs].forEach(d => {
        if (!allSessionIds.has(d.id)) {
          allSessionIds.add(d.id);
          allSessions.push({ id: d.id, ...d.data() });
        }
      });
      setSessions(allSessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));

      // Load style quiz result
      const quizSnap = await getDocs(
        query(collection(db, "styleQuiz"), where("userId", "==", clientId))
      );
      if (!quizSnap.empty) setQuizResult(quizSnap.docs[0].data());

    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const initials = client?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";
  const TABS = ["about", "closet", "sessions", "style"];

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" onClick={() => nav("/stylist")} style={{ cursor: "pointer" }}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        {/* Message button */}
        <button
          className="btn-pink btn-sm"
          onClick={() => nav(`/stylist/chat/${clientId}`)}
          style={{ fontSize: 12 }}
        >
          Message
        </button>
      </div>

      <div className="screen">
        <div className="body">
          {loading ? (
            <SkeletonList count={4} />
          ) : !client ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Client not found</div>
            </div>
          ) : (
            <>
              {/* ── Profile header ── */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div className="avatar" style={{
                  width: 88, height: 88, margin: "0 auto 12px",
                  background: "var(--pink-light)", color: "var(--pink-dark)",
                  fontSize: 28, overflow: "hidden",
                }}>
                  {client.photoUrl
                    ? <img src={client.photoUrl} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials
                  }
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{client.name}</div>
                {client.username && (
                  <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 6 }}>@{client.username}</div>
                )}
                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{sessions.length}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Sessions</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{closetItems.length}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Closet items</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: sessions.some(s => s.status === "active") ? "var(--success)" : "var(--text-primary)" }}>
                      {sessions.some(s => s.status === "active") ? "Active" : "Past"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Status</div>
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 16, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", flexWrap: "nowrap" }}>
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? "var(--pink)" : "var(--text-secondary)",
                    borderBottom: `2px solid ${activeTab === tab ? "var(--pink)" : "transparent"}`,
                    paddingBottom: 10, paddingTop: 4, paddingLeft: 14, paddingRight: 14,
                    marginBottom: -2, whiteSpace: "nowrap", textTransform: "capitalize",
                  }}>{tab === "style" ? "Style Quiz" : tab}</button>
                ))}
              </div>

              {/* ── About tab ── */}
              {activeTab === "about" && (
                <div>
                  {client.about && (
                    <div className="card">
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>About</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{client.about}</div>
                    </div>
                  )}
                  {client.city && (
                    <div className="card">
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Location</div>
                      <div style={{ fontSize: 14 }}>{client.city}</div>
                    </div>
                  )}
                  <div className="card">
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Account</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Plan</span>
                      <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>
                        {client.subscriptionTier || "Free"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
                      <span>Member since</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Closet tab ── */}
              {activeTab === "closet" && (
                <div>
                  {closetItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                      <div style={{ fontSize: 14 }}>No public closet items</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                        Client may have set items to private
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
                        {closetItems.length} visible item{closetItems.length !== 1 ? "s" : ""} — tap to enlarge
                      </div>
                      <div className="closet-grid">
                        {closetItems.map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() => setLightboxIndex(idx)}
                            style={{ cursor: "pointer", position: "relative", borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)", aspectRatio: "1" }}
                          >
                            <img
                              src={item.imageUrl || item.fallbackUrl}
                              alt={item.name}
                              onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "12px 6px 4px" }}>
                              <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textTransform: "capitalize" }}>{item.attributes?.primaryColor}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Sessions tab ── */}
              {activeTab === "sessions" && (
                <div>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                      <div style={{ fontSize: 14 }}>No sessions yet</div>
                    </div>
                  ) : sessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => nav(`/stylist/chat/${clientId}`)}
                      style={{ background: "var(--bg-card)", border: `0.5px solid ${s.status === "active" ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>Session</span>
                        <span style={{
                          fontSize: 10, borderRadius: 20, padding: "2px 10px", fontWeight: 500,
                          background: s.status === "active" ? "#d1fae5" : "var(--bg)",
                          border: `1px solid ${s.status === "active" ? "#6ee7b7" : "var(--border)"}`,
                          color: s.status === "active" ? "#065f46" : "var(--text-tertiary)",
                        }}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        Started {timeAgo(s.startedAt)}
                        {s.endedAt ? ` · Ended ${timeAgo(s.endedAt)}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Style Quiz tab ── */}
              {activeTab === "style" && (
                <div>
                  {(!quizResult || (!quizResult.styleProfile && !quizResult.answers)) ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                      <div style={{ fontSize: 14 }}>Client hasn't taken the style quiz yet</div>
                    </div>
                  ) : (
                    <div className="card">
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Style Profile</div>
                      {Object.entries(quizResult.styleProfile || quizResult.answers || {}).map(([key, value]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
                          <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                          <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{Array.isArray(value) ? value.join(", ") : value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Closet lightbox ── */}
      {lightboxIndex !== null && closetItems.length > 0 && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <button onClick={() => setLightboxIndex(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 42, height: 42, color: "white", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            {lightboxIndex + 1} / {closetItems.length}
          </div>
          <img
            src={closetItems[lightboxIndex]?.imageUrl || closetItems[lightboxIndex]?.fallbackUrl}
            alt={closetItems[lightboxIndex]?.name}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "82vw", maxHeight: "65vh", borderRadius: 14, objectFit: "contain" }}
          />
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ color: "white", fontSize: 16, fontWeight: 500 }}>{closetItems[lightboxIndex]?.name}</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4, textTransform: "capitalize" }}>
              {closetItems[lightboxIndex]?.category}{closetItems[lightboxIndex]?.attributes?.primaryColor ? ` · ${closetItems[lightboxIndex].attributes.primaryColor}` : ""}
            </div>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 24, marginTop: 24 }}>
            <button onClick={() => setLightboxIndex(i => (i - 1 + closetItems.length) % closetItems.length)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 52, height: 52, color: "white", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <button onClick={() => setLightboxIndex(i => (i + 1) % closetItems.length)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 52, height: 52, color: "white", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      )}

      <TabBar active="clients" type="stylist" />
    </>
  );
}

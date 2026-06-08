import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";
import { SkeletonList } from "../components/SkeletonLoader";

export default function StylistClients() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blockingId, setBlockingId] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | past

  useEffect(() => {
    if (currentUser?.uid) {
      loadClients();
      loadBlocked();
    }
  }, [currentUser]);

  async function loadClients() {
    setLoading(true);
    try {
      // Source 1: chatSessions collection
      const sessionSnap = await getDocs(
        query(collection(db, "chatSessions"), where("stylistId", "==", currentUser.uid))
      );

      const clientMap = {};

      // Add all clients from sessions
      sessionSnap.docs.forEach(d => {
        const data = d.data();
        if (data.clientId && !clientMap[data.clientId]) {
          clientMap[data.clientId] = {
            clientId: data.clientId,
            sessions: [],
            lastSessionAt: data.startedAt,
            isActive: data.status === "active",
          };
        }
        if (data.clientId && clientMap[data.clientId]) {
          clientMap[data.clientId].sessions.push(data);
          if (data.status === "active") clientMap[data.clientId].isActive = true;
          if (new Date(data.startedAt) > new Date(clientMap[data.clientId].lastSessionAt)) {
            clientMap[data.clientId].lastSessionAt = data.startedAt;
          }
        }
      });

      // Source 2: scan ALL messages and find ones in this stylist's conversations
      // conversationId format: [uid1, uid2].sort().join("_")
      // So any conversationId containing currentUser.uid is this stylist's
      // Scan messages to find clients - try filtered query first
      try {
        const msgSnap = await getDocs(
          query(collection(db, "messages"),
            where("conversationId", ">=", currentUser.uid.substring(0, 10)),
          )
        );
        msgSnap.docs.forEach(d => {
          const data = d.data();
          const convId = data.conversationId || "";
          if (!convId.includes(currentUser.uid)) return;
          if (data.senderId === currentUser.uid) return;
          const clientId = data.senderId;
          if (!clientId || clientMap[clientId]) return;
          clientMap[clientId] = {
            clientId,
            sessions: [],
            lastSessionAt: data.createdAt || new Date().toISOString(),
            isActive: false,
          };
        });
      } catch(msgErr) {
        // Fallback: scan all messages
        try {
          const allMsgSnap = await getDocs(collection(db, "messages"));
          allMsgSnap.docs.forEach(d => {
            const data = d.data();
            const convId = data.conversationId || "";
            if (!convId.includes(currentUser.uid)) return;
            if (data.senderId === currentUser.uid) return;
            const clientId = data.senderId;
            if (!clientId || clientMap[clientId]) return;
            clientMap[clientId] = {
              clientId,
              sessions: [],
              lastSessionAt: data.createdAt || new Date().toISOString(),
              isActive: false,
            };
          });
        } catch(e2) { console.error("Message scan failed:", e2); }
      }

      // Load user profiles for all clients
      const withProfiles = await Promise.all(
        Object.values(clientMap).map(async c => {
          try {
            const userSnap = await getDoc(doc(db, "users", c.clientId));
            const user = userSnap.exists() ? userSnap.data() : null;
            return { ...c, user };
          } catch(e) { return { ...c, user: null }; }
        })
      );

      // Filter out stylists and null profiles, sort by most recent
      const validClients = withProfiles
        .filter(c => c.user && c.user.accountType !== "stylist")
        .sort((a, b) => new Date(b.lastSessionAt) - new Date(a.lastSessionAt));

      setClients(validClients);
    } catch(e) { console.error("loadClients error:", e); }
    setLoading(false);
  }

  
  async function loadBlocked() {
    try {
      const snap = await getDocs(
        query(collection(db, "blockedUsers"), where("stylistId", "==", currentUser.uid))
      );
      setBlockedIds(new Set(snap.docs.map(d => d.data().clientId)));
    } catch(e) {}
  }

  async function toggleBlock(clientId, clientName) {
    setBlockingId(clientId);
    try {
      if (blockedIds.has(clientId)) {
        const snap = await getDocs(
          query(collection(db, "blockedUsers"),
            where("stylistId", "==", currentUser.uid),
            where("clientId", "==", clientId))
        );
        for (const d of snap.docs) await deleteDoc(doc(db, "blockedUsers", d.id));
        setBlockedIds(prev => { const n = new Set(prev); n.delete(clientId); return n; });
        setToast(`${clientName} unblocked`);
      } else {
        await addDoc(collection(db, "blockedUsers"), {
          stylistId: currentUser.uid, clientId, clientName,
          createdAt: new Date().toISOString(),
        });
        setBlockedIds(prev => new Set([...prev, clientId]));
        setToast(`${clientName} blocked`);
      }
    } catch(e) { setToast("Failed. Try again."); }
    setBlockingId(null);
  }

  const filtered = clients
    .filter(c => {
      if (filter === "active") return c.isActive;
      if (filter === "past") return !c.isActive;
      return true;
    })
    .filter(c => {
      if (!search) return true;
      const name = c.user?.name?.toLowerCase() || "";
      return name.includes(search.toLowerCase());
    });

  function getLastActive(dateStr) {
    if (!dateStr) return "Unknown";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}>
          <em>closet</em><span>mingle</span>
        </div>
        <span className="badge badge-pink">{clients.length} clients</span>
      </div>

      <div className="screen">
        <div className="body">
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
            <input
              className="input-field"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, marginBottom: 0 }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["all", "active", "past"].map(f => (
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
              <div style={{ fontSize: 32, marginBottom: 12, color: "var(--text-tertiary)" }}><i className="ti ti-users" style={{ fontSize: 48 }} aria-hidden="true"></i></div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {clients.length === 0 ? "No clients yet" : "No clients match your search"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {clients.length === 0
                  ? "Turn on your availability so clients can find and book you"
                  : "Try a different search term"
                }
              </div>
            </div>
          ) : filtered.map(c => (
            <div
              key={c.clientId}
              onClick={() => nav(`/stylist/chat/${c.clientId}`)}
              style={{ background: "var(--bg-card)", border: `0.5px solid ${c.isActive ? "#6ee7b7" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className="avatar" onClick={() => nav(`/stylist/client/${c.clientId}`)} style={{ width: 48, height: 48, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 15, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}>
                  {c.user?.photoUrl
                    ? <img src={c.user.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : c.user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{c.user?.name || "Client"}</div>
                  {c.user?.username && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>@{c.user.username}</div>}
                    {c.isActive && (
                      <span style={{ fontSize: 9, background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "1px 6px", color: "#065f46" }}>Active</span>
                    )}
                  </div>
                  {c.user?.city && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.user.city}</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    {c.completedSessions} session{c.completedSessions !== 1 ? "s" : ""} completed · Last active: {getLastActive(c.lastSessionAt)}
                  </div>

                  {/* Style quiz summary */}
                  {c.quiz?.styleProfile && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {[c.quiz.styleProfile.primaryStyle, c.quiz.styleProfile.colorPreference].filter(Boolean).map((tag, i) => (
                        <span key={i} style={{ fontSize: 10, background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: 10, padding: "1px 8px", color: "var(--pink-dark)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); nav(`/stylist/chat/${c.clientId}`); }}
                    className="btn-pink btn-sm"
                    style={{ fontSize: 11 }}
                  >Chat</button>
                  <button
                    onClick={e => { e.stopPropagation(); toggleBlock(c.clientId, c.user?.name || "Client"); }}
                    disabled={blockingId === c.clientId}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                      background: "none", borderRadius: "var(--radius-sm)",
                      border: `1px solid ${blockedIds.has(c.clientId) ? "var(--success)" : "var(--danger)"}`,
                      color: blockedIds.has(c.clientId) ? "var(--success)" : "var(--danger)",
                    }}
                  >{blockingId === c.clientId ? "..." : blockedIds.has(c.clientId) ? "Unblock" : "Block"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="clients" type="stylist" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

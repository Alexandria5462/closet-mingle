import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs, onSnapshot,
  doc, getDoc, addDoc, deleteDoc
} from "firebase/firestore";
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blockingId, setBlockingId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadClients();
    loadBlocked();

    // Live listener — add client instantly when they send a message
    const unsub = onSnapshot(collection(db, "messages"), async (snap) => {
      const newClientIds = new Set();
      snap.docs.forEach(d => {
        const data = d.data();
        const convId = data.conversationId || "";
        if (!convId.includes(currentUser.uid)) return;
        const parts = convId.split("_");
        const clientId = parts.find(id => id !== currentUser.uid);
        if (clientId) newClientIds.add(clientId);
      });
      // If any new clients found not currently in state, reload
      setClients(prev => {
        const existingIds = new Set(prev.map(c => c.clientId));
        const hasNew = [...newClientIds].some(id => !existingIds.has(id));
        if (hasNew) { loadClients(); }
        return prev;
      });
    });
    return unsub;
  }, [currentUser]);

  async function loadClients() {
    setLoading(true);
    const clientMap = {};

    try {
      // ── SOURCE 1: chatSessions collection ──────────────────
      const sessionSnap = await getDocs(
        query(collection(db, "chatSessions"),
          where("stylistId", "==", currentUser.uid)
        )
      );
      sessionSnap.docs.forEach(d => {
        const data = d.data();
        if (!data.clientId) return;
        if (!clientMap[data.clientId]) {
          clientMap[data.clientId] = {
            clientId: data.clientId,
            isActive: data.status === "active",
            lastSessionAt: data.startedAt || new Date().toISOString(),
            sessions: [],
          };
        }
        clientMap[data.clientId].sessions.push(data);
        if (data.status === "active") clientMap[data.clientId].isActive = true;
      });

      // ── SOURCE 2: messages collection ──────────────────────
      // Get ALL messages, find ones in this stylist's conversations
      // A conversationId = [clientUid, stylistUid].sort().join("_")
      // So it always contains the stylist's UID
      let allMessages = [];
      try {
        const msgSnap = await getDocs(collection(db, "messages"));
        allMessages = msgSnap.docs.map(d => d.data());
      } catch(e) {
        console.error("Could not read messages:", e);
      }

      // Find unique clients from messages
      // conversationId = [clientUid, stylistUid].sort().join("_")
      // Extract the OTHER party (not the stylist) from each conversation
      const newClientIds = new Set();
      allMessages.forEach(data => {
        const convId = data.conversationId || "";
        if (!convId.includes(currentUser.uid)) return;
        // Get the client id = the part of convId that isn't the stylist
        const parts = convId.split("_");
        const clientId = parts.find(id => id !== currentUser.uid);
        if (!clientId) return;
        if (!clientMap[clientId]) {
          newClientIds.add(clientId);
          clientMap[clientId] = {
            clientId,
            isActive: false,
            lastSessionAt: data.createdAt || new Date().toISOString(),
            sessions: [],
          };
        } else {
          // Update last activity
          if (data.createdAt > clientMap[clientId].lastSessionAt) {
            clientMap[clientId].lastSessionAt = data.createdAt;
          }
        }
      });

      // ── SOURCE 3: Create missing chatSessions for new clients ─
      // This fixes clients who messaged before auto-register was deployed
      for (const clientId of newClientIds) {
        try {
          const conversationId = [clientId, currentUser.uid].sort().join("_");
          const existing = await getDocs(
            query(collection(db, "chatSessions"),
              where("conversationId", "==", conversationId)
            )
          );
          if (existing.empty) {
            // Create missing session so this client always shows up
            await addDoc(collection(db, "chatSessions"), {
              conversationId,
              clientId,
              stylistId: currentUser.uid,
              status: "active",
              startedAt: clientMap[clientId].lastSessionAt,
            });
          }
        } catch(e) { /* non-critical */ }
      }

      // ── Load user profiles ──────────────────────────────────
      const withProfiles = await Promise.all(
        Object.values(clientMap).map(async c => {
          try {
            const userSnap = await getDoc(doc(db, "users", c.clientId));
            const user = userSnap.exists() ? { uid: c.clientId, ...userSnap.data() } : null;
            return { ...c, user };
          } catch(e) {
            return { ...c, user: null };
          }
        })
      );

      // Show all clients — only exclude confirmed stylists
      // If profile failed to load, still show with fallback (don't drop them)
      const validClients = withProfiles
        .filter(c => c.user?.accountType !== "stylist")
        .map(c => ({
          ...c,
          user: c.user || { uid: c.clientId, name: "Client", accountType: "client" }
        }))
        .sort((a, b) => new Date(b.lastSessionAt) - new Date(a.lastSessionAt));

      setClients(validClients);
    } catch(e) {
      console.error("loadClients error:", e);
    }
    setLoading(false);
  }

  async function loadBlocked() {
    try {
      const snap = await getDocs(
        query(collection(db, "blockedUsers"),
          where("stylistId", "==", currentUser.uid)
        )
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
            where("clientId", "==", clientId)
          )
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
      const q = search.toLowerCase();
      return (c.user?.name || "").toLowerCase().includes(q) ||
             (c.user?.username || "").toLowerCase().includes(q);
    });

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav("/stylist")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" onClick={() => nav("/stylist")} style={{ cursor: "pointer" }}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        <span className="badge" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)" }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="screen">
        <div className="body">

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["all", "active", "past"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: `1px solid ${filter === f ? "var(--pink)" : "var(--border)"}`,
                background: filter === f ? "var(--pink)" : "var(--bg-card)",
                color: filter === f ? "white" : "var(--text-secondary)",
                cursor: "pointer", textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>

          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="ti ti-users" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {search ? "No clients match your search" : "No clients yet"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {search ? "Try a different name" : "Clients appear here when they message you"}
              </div>
            </div>
          ) : filtered.map(c => (
            <div
              key={c.clientId}
              style={{
                background: blockedIds.has(c.clientId) ? "var(--bg)" : "var(--bg-card)",
                border: `0.5px solid ${c.isActive ? "#6ee7b7" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                opacity: blockedIds.has(c.clientId) ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar — tap to view profile */}
                <div
                  className="avatar"
                  onClick={() => nav(`/stylist/client/${c.clientId}`)}
                  style={{ width: 48, height: 48, background: "var(--avatar-bg)", color: "var(--pink-dark)", fontSize: 15, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
                >
                  {c.user?.photoUrl
                    ? <img src={c.user.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (c.user?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => nav(`/stylist/client/${c.clientId}`)}>
                  <div style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    {c.user?.name || "Client"}
                  </div>
                  {c.user?.username && (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>@{c.user.username}</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: c.isActive ? "var(--success)" : "var(--text-tertiary)",
                      display: "inline-block"
                    }} />
                    <span style={{ fontSize: 11, color: c.isActive ? "var(--success)" : "var(--text-tertiary)" }}>
                      {c.isActive ? "Active" : "Past"}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => nav(`/stylist/chat/${c.clientId}`)}
                    className="btn-pink btn-sm"
                    style={{ fontSize: 11 }}
                  >Chat</button>
                  <button
                    onClick={() => toggleBlock(c.clientId, c.user?.name || "Client")}
                    disabled={blockingId === c.clientId}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontFamily: "inherit",
                      cursor: "pointer", background: "none", borderRadius: "var(--radius-sm)",
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

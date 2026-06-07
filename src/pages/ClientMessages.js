import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function ClientMessages() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const localReadRef = useRef(new Set());

  useEffect(() => {
    if (currentUser?.uid) loadConversations();
  }, [currentUser]);

  async function loadConversations() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "messages"));
      const convMap = {};

      snap.docs.forEach(d => {
        const data = d.data();
        const convId = data.conversationId || "";
        if (!convId.includes(currentUser.uid)) return;
        if (!convMap[convId]) {
          convMap[convId] = { id: convId, messages: [], unread: 0 };
        }
        convMap[convId].messages.push(data);
        if (!data.read && data.senderId !== currentUser.uid) {
          convMap[convId].unread++;
        }
      });

      // Load stylist info for each conversation
      const convList = await Promise.all(
        Object.values(convMap).map(async conv => {
          const stylistId = conv.id.replace(currentUser.uid, "").replace("_", "");
          try {
            const stylistSnap = await getDocs(
              query(collection(db, "users"), where("__name__", "==", stylistId))
            );
            const stylist = !stylistSnap.empty ? stylistSnap.docs[0].data() : null;
            const sorted = conv.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return {
              id: conv.id,
              conversationId: conv.id,
              stylistId,
              stylist,
              lastMessage: sorted[0],
              lastMessageAt: sorted[0]?.createdAt || "",
              unread: localReadRef.current.has(conv.id) ? 0 : conv.unread,
              messageCount: conv.messages.length,
            };
          } catch(e) { return null; }
        })
      );

      const valid = convList
        .filter(Boolean)
        .filter(c => c.stylist?.accountType === "stylist")
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      setConversations(valid);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function openConversation(conv) {
    if (conv.unread > 0) {
      localReadRef.current.add(conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
      try {
        const unreadSnap = await getDocs(
          query(collection(db, "messages"),
            where("conversationId", "==", conv.conversationId),
            where("read", "==", false)
          )
        );
        const batch = writeBatch(db);
        unreadSnap.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
        localReadRef.current.delete(conv.id);
      } catch(e) {}
    }
    nav(`/chat/${conv.stylistId}`);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const filtered = conversations.filter(conv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (conv.stylist?.name || "").toLowerCase().includes(q) ||
      (conv.stylist?.username || "").toLowerCase().includes(q) ||
      (conv.lastMessage?.content || "").toLowerCase().includes(q);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" onClick={() => nav("/home")} style={{ cursor: "pointer" }}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        {totalUnread > 0 && (
          <span style={{ background: "var(--pink)", color: "white", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            {totalUnread} unread
          </span>
        )}
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Messages</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            Your conversations with stylists
          </div>

          {/* Search */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
              <input
                className="input-field"
                placeholder="Search by stylist name or message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, marginBottom: 0 }}
              />
            </div>
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="ti ti-message-circle-off" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {search ? "No results found" : "No messages yet"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                {search ? "Try a different search" : "Find a stylist and start your first session"}
              </div>
              {!search && (
                <button className="btn-pink" onClick={() => nav("/find-stylist")} style={{ width: "auto", padding: "10px 24px" }}>
                  Find a stylist
                </button>
              )}
            </div>
          ) : filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              style={{
                background: conv.unread > 0 ? "var(--pink-light)" : "var(--bg-card)",
                border: `0.5px solid ${conv.unread > 0 ? "#f4c0d1" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              }}
            >
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div className="avatar" style={{ width: 48, height: 48, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden" }}>
                  {conv.stylist?.photoUrl
                    ? <img src={conv.stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : conv.stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST"
                  }
                </div>
                {conv.unread > 0 && (
                  <div style={{ position: "absolute", top: -2, right: -2, background: "var(--pink)", borderRadius: "50%", width: 16, height: 16, fontSize: 9, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                    {conv.unread}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: conv.unread > 0 ? 600 : 500 }}>
                    {conv.stylist?.name || "Stylist"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>
                    {timeAgo(conv.lastMessageAt)}
                  </div>
                </div>
                {conv.stylist?.specialty && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 2 }}>{conv.stylist.specialty}</div>
                )}
                <div style={{ fontSize: 12, color: conv.unread > 0 ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.lastMessage?.type === "image" ? "Photo" :
                   conv.lastMessage?.type === "video_invite" ? "Video call" :
                   conv.lastMessage?.type === "session_ended" ? "Session ended" :
                   conv.lastMessage?.content || "No messages yet"}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)", flexShrink: 0 }} aria-hidden="true"></i>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="account" type="client" />
    </>
  );
}

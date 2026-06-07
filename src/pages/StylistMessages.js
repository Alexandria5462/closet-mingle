import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function StylistMessages() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadConversations();
  }, [currentUser]);

  async function loadConversations() {
    setLoading(true);
    setError(null);
    try {
      // Get all messages involving this stylist
      const snap = await getDocs(
        query(collection(db, "messages"), where("conversationId", ">=", currentUser.uid))
      );

      // Group by conversationId
      const convMap = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.conversationId.includes(currentUser.uid)) return;
        if (!convMap[data.conversationId]) {
          convMap[data.conversationId] = { id: data.conversationId, messages: [], unread: 0 };
        }
        convMap[data.conversationId].messages.push(data);
        if (!data.read && data.senderId !== currentUser.uid) {
          convMap[data.conversationId].unread++;
        }
      });

      // Get client info for each conversation
      const convList = await Promise.all(
        Object.values(convMap).map(async conv => {
          const clientId = conv.id.replace(currentUser.uid, "").replace("_", "");
          try {
            const clientSnap = await getDocs(
              query(collection(db, "users"), where("__name__", "==", clientId))
            );
            const client = !clientSnap.empty ? clientSnap.docs[0].data() : null;
            const sorted = conv.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return {
              id: conv.id,
              clientId,
              client,
              lastMessage: sorted[0],
              unread: conv.unread,
              messageCount: conv.messages.length,
            };
          } catch (e) {
            return null;
          }
        })
      );

      const valid = convList.filter(Boolean).sort((a, b) =>
        new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
      );

      setConversations(valid);
    } catch (e) {
      console.error("Messages load error:", e);
      setError("Failed to load messages.");
    }
    setLoading(false);
  }

  function getTimeAgo(dateStr) {
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

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}>
          <em>closet</em><span>mingle</span>
        </div>
        <span className="badge badge-pink">
          {conversations.filter(c => c.unread > 0).length} unread
        </span>
      </div>

      <div className="screen">
        <div className="body">
          <div className="section-label">Messages</div>

          {loading ? (
            <SkeletonList count={4} />
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>{error}</div>
              <button className="btn-pink" onClick={loadConversations} style={{ width: "auto", padding: "10px 24px" }}>Try again</button>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No messages yet</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                When clients reach out your conversations will appear here
              </div>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              onClick={async () => {
                // Mark all unread messages in this conversation as read
                if (conv.unread > 0) {
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
                  } catch(e) { console.error(e); }
                }
                nav(`/stylist/chat/${conv.clientId}`);
              }}
              style={{ background: conv.unread > 0 ? "var(--pink-light)" : "var(--bg-card)", border: `0.5px solid ${conv.unread > 0 ? "#f4c0d1" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div className="avatar" style={{ width: 48, height: 48, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                {conv.client?.photoUrl
                  ? <img src={conv.client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : conv.client?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
                }
                {conv.unread > 0 && (
                  <div style={{ position: "absolute", top: -2, right: -2, background: "var(--pink)", borderRadius: "50%", width: 16, height: 16, fontSize: 9, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                    {conv.unread}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: conv.unread > 0 ? 600 : 500, color: "var(--text-primary)" }}>
                    {conv.client?.name || "Client"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>
                    {getTimeAgo(conv.lastMessage?.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.lastMessage?.type === "image" ? "📷 Photo" :
                    conv.lastMessage?.type === "video_invite" ? "📹 Video call" :
                    conv.lastMessage?.type === "session_ended" ? "✅ Session completed" :
                    conv.lastMessage?.content || "No messages yet"
                  }
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {conv.client?.subscriptionTier === "session" && (
                    <span style={{ fontSize: 9, background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: 10, padding: "1px 6px", color: "#065f46" }}>Pay Per Session</span>
                  )}
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{conv.messageCount} messages</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="messages" type="stylist" />
    </>
  );
}

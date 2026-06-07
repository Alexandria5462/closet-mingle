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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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
            // Load session status for this conversation
            let sessionStatus = "none";
            try {
              const sessionSnap = await getDocs(
                query(collection(db, "chatSessions"),
                  where("conversationId", "==", conv.id)
                )
              );
              if (!sessionSnap.empty) {
                sessionStatus = sessionSnap.docs[0].data().status || "active";
              }
            } catch(e) {}

            return {
              id: conv.id,
              conversationId: conv.id,
              clientId,
              client,
              lastMessage: sorted[0],          // full object for display
              lastMessageAt: sorted[0]?.createdAt || "",  // string for sorting
              unread: conv.unread,
              messageCount: conv.messages.length,
              sessionStatus,
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

  // ── Apply search + filters ────────────────────────────
  const filteredConversations = conversations
    .filter(conv => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (conv.client?.name || "").toLowerCase().includes(q);
        const usernameMatch = (conv.client?.username || "").toLowerCase().includes(q);
        const msgMatch = (conv.lastMessage?.content || "").toLowerCase().includes(q);
        if (!nameMatch && !usernameMatch && !msgMatch) return false;
      }
      // Status filter
      if (filterBy === "unread") return conv.unread > 0;
      if (filterBy === "active") return conv.sessionStatus === "active";
      if (filterBy === "ended") return conv.sessionStatus === "ended" || conv.sessionStatus === "closed";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.lastMessageAt || b.lastMessage?.createdAt || 0) - new Date(a.lastMessageAt || a.lastMessage?.createdAt || 0);
      if (sortBy === "oldest") return new Date(a.lastMessageAt || a.lastMessage?.createdAt || 0) - new Date(b.lastMessageAt || b.lastMessage?.createdAt || 0);
      if (sortBy === "unread") return (b.unread || 0) - (a.unread || 0);
      if (sortBy === "name") return (a.client?.name || "").localeCompare(b.client?.name || "");
      return 0;
    });

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

          {/* ── Search bar ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
              <input
                className="input-field"
                placeholder="Search by name, @username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && e.target.blur()}
                style={{ paddingLeft: 36, paddingRight: search ? 36 : 12, marginBottom: 0 }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16, lineHeight: 1 }}
                >✕</button>
              )}
            </div>
            <button
              onClick={() => {}}
              style={{ background: "var(--pink)", border: "none", borderRadius: "var(--radius-sm)", padding: "0 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", flexShrink: 0 }}
            >Search</button>
          </div>

          {/* ── Filter row — horizontal scroll only ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
            {[
              { key: "sort-newest", label: "Newest", group: "sort", val: "newest" },
              { key: "sort-oldest", label: "Oldest", group: "sort", val: "oldest" },
              { key: "sort-unread", label: "Most unread", group: "sort", val: "unread" },
              { key: "sort-name",   label: "Name A–Z",   group: "sort", val: "name" },
              { key: "filter-all",    label: "All",     group: "filter", val: "all" },
              { key: "filter-unread", label: "Unread",  group: "filter", val: "unread" },
              { key: "filter-active", label: "Active",  group: "filter", val: "active" },
              { key: "filter-ended",  label: "Ended",   group: "filter", val: "ended" },
            ].map(f => {
              const isActive = f.group === "sort" ? sortBy === f.val : filterBy === f.val;
              return (
                <button
                  key={f.key}
                  onClick={() => f.group === "sort" ? setSortBy(f.val) : setFilterBy(f.val)}
                  style={{
                    padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: `1.5px solid ${isActive ? "var(--pink)" : "var(--border)"}`,
                    background: isActive ? "var(--pink)" : "var(--bg-card)",
                    color: isActive ? "white" : "var(--text-secondary)",
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >{f.label}</button>
              );
            })}
          </div>

          {/* ── Results count ── */}
          {(search || filterBy !== "all") && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {filteredConversations.length} result{filteredConversations.length !== 1 ? "s" : ""}
              {search && <> for "<strong>{search}</strong>"</>}
              {" "}
              <button
                onClick={() => { setSearch(""); setFilterBy("all"); setSortBy("newest"); }}
                style={{ background: "none", border: "none", color: "var(--pink)", cursor: "pointer", fontSize: 12, padding: 0 }}
              >Clear filters</button>
            </div>
          )}

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
          ) : filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={async () => {
                // Mark as read in local state immediately for instant UI update
                if (conv.unread > 0) {
                  setConversations(prev => prev.map(c =>
                    c.id === conv.id ? { ...c, unread: 0 } : c
                  ));
                  // Also update Firebase in background
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
              <div
                className="avatar"
                onClick={e => { e.stopPropagation(); nav(`/stylist/client/${conv.clientId}`); }}
                style={{ width: 48, height: 48, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0, position: "relative", cursor: "pointer" }}
                title="View client profile"
              >
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

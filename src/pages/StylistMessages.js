import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where,
  getDocs, writeBatch, onSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function StylistMessages() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const sessionStatusMap = useRef({}); // conversationId -> "active"|"ended"

  // Tracks which convIds have been marked read in THIS session
  const readConvIds = useRef(new Set());

  // Live chatSessions listener — keeps sessionStatusMap in sync
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, "chatSessions"), where("stylistId", "==", currentUser.uid)),
      (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.conversationId) {
            sessionStatusMap.current[data.conversationId] = data.status || "active";
          }
        });
        // Re-tag conversations with latest session status
        setConversations(prev => prev.map(c => ({
          ...c,
          sessionStatus: sessionStatusMap.current[c.conversationId] || "active",
        })));
      }
    );
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToConversations();
    return unsub;
  }, [currentUser]);

  function subscribeToConversations() {
    // Use onSnapshot so the list stays live.
    // Query only conversations this stylist participates in — required so the
    // Firestore security rules permit the read.
    const unsub = onSnapshot(
      query(collection(db, "messages"), where("participants", "array-contains", currentUser.uid)),
      async (snap) => {
        try {
          // Group by conversationId
          const convMap = {};
          snap.docs.forEach(d => {
            const data = d.data();
            const convId = data.conversationId || "";
            if (!convId) return;
            if (!convMap[convId]) {
              convMap[convId] = {
                id: convId,
                conversationId: convId,
                messages: [],
                unread: 0,
              };
            }
            convMap[convId].messages.push(data);
            // Only count as unread if: not read, not sent by stylist,
            // AND not in our local readConvIds set
            if (!data.read &&
                data.senderId !== currentUser.uid &&
                !readConvIds.current.has(convId)) {
              convMap[convId].unread++;
            }
          });

          // Build conversation list with client info
          const convList = await Promise.all(
            Object.values(convMap).map(async conv => {
              // Extract clientId from conversationId
              const clientId = conv.id
                .split("_")
                .find(id => id !== currentUser.uid);
              if (!clientId) return null;

              // Get client profile
              let client = null;
              try {
                const clientSnap = await getDocs(
                  query(collection(db, "users"),
                    where("__name__", "==", clientId)
                  )
                );
                if (!clientSnap.empty) {
                  client = { uid: clientId, ...clientSnap.docs[0].data() };
                }
              } catch(e) {}

              // Sort messages by time
              const sorted = conv.messages.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
              );
              const last = sorted[sorted.length - 1];

              return {
                id: conv.id,
                conversationId: conv.id,
                clientId,
                client,
                lastMessage: last,
                lastMessageAt: last?.createdAt || "",
                unread: readConvIds.current.has(conv.id) ? 0 : conv.unread,
                messageCount: conv.messages.length,
                // Pull session status from our live map
                sessionStatus: sessionStatusMap.current[conv.id] || "active",
              };
            })
          );

          const valid = convList
            .filter(Boolean)
            .filter(c => c.client && c.client.accountType !== "stylist");

          setConversations(valid);
        } catch(e) {
          console.error("Messages subscription error:", e);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Messages listener error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }

  async function openConversation(conv) {
    // Mark as read in local ref FIRST - this persists through re-renders
    readConvIds.current.add(conv.id);

    // Update local state immediately for instant UI
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
    );

    // Write to Firebase - when onSnapshot fires, readConvIds prevents revert
    if (conv.unread > 0) {
      try {
        const unreadSnap = await getDocs(
          query(collection(db, "messages"),
            where("conversationId", "==", conv.conversationId),
            where("read", "==", false)
          )
        );
        if (!unreadSnap.empty) {
          const batch = writeBatch(db);
          unreadSnap.docs.forEach(d => {
            if (d.data().senderId !== currentUser.uid) {
              batch.update(d.ref, { read: true });
            }
          });
          await batch.commit();
        }
      } catch(e) {
        console.error("Mark read error:", e);
      }
    }

    nav(`/stylist/chat/${conv.clientId}`);
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
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const totalUnread = conversations
    .filter(c => !readConvIds.current.has(c.id))
    .reduce((sum, c) => sum + (c.unread || 0), 0);

  const filtered = conversations
    .filter(conv => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (conv.client?.name || "").toLowerCase().includes(q);
        const userMatch = (conv.client?.username || "").toLowerCase().includes(q);
        const msgMatch = (conv.lastMessage?.content || "").toLowerCase().includes(q);
        if (!nameMatch && !userMatch && !msgMatch) return false;
      }
      if (filterBy === "unread") return conv.unread > 0;
      if (filterBy === "active") return conv.sessionStatus === "active";
      if (filterBy === "past")   return conv.sessionStatus === "ended";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.lastMessageAt) - new Date(b.lastMessageAt);
      if (sortBy === "unread") return (b.unread || 0) - (a.unread || 0);
      if (sortBy === "name") return (a.client?.name || "").localeCompare(b.client?.name || "");
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt); // newest
    });

  const FILTER_PILLS = [
    { key: "all",    label: "All",     group: "filter" },
    { key: "unread", label: "Unread",  group: "filter" },
    { key: "active", label: "Active",  group: "filter" },
    { key: "ended",  label: "Ended",   group: "filter" },
    { key: "newest", label: "Newest",  group: "sort" },
    { key: "oldest", label: "Oldest",  group: "sort" },
    { key: "unread", label: "Most unread", group: "sort" },
    { key: "name",   label: "Name A–Z", group: "sort" },
  ];

  return (
    <>
      <div className="header">
        <div className="logo" onClick={() => nav("/stylist")} style={{ cursor: "pointer" }}>
          <em>closet</em><span>mingle</span>
        </div>
        {totalUnread > 0 && (
          <span style={{ background: "#e53935", color: "white", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            {totalUnread} unread
          </span>
        )}
      </div>

      <div className="screen">
        <div className="body">

          {/* Search */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 15 }} aria-hidden="true"></i>
              <input
                className="input-field"
                placeholder="Search by name or message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, marginBottom: 0 }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16 }}>✕</button>
              )}
            </div>
            <button
              style={{ background: "var(--pink)", border: "none", borderRadius: "var(--radius-sm)", padding: "0 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", flexShrink: 0 }}
            >Search</button>
          </div>

          {/* Filter pills — horizontal scroll only */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
            {[
              { val: "all",    label: "All",          group: "filter" },
              { val: "unread", label: "Unread",        group: "filter" },
              { val: "active", label: "Active",        group: "filter" },
              { val: "past",   label: "Past",          group: "filter" },
              { val: "newest", label: "Newest first",  group: "sort" },
              { val: "oldest", label: "Oldest first",  group: "sort" },
              { val: "name",   label: "Name A–Z",      group: "sort" },
            ].map(f => {
              const isActive = f.group === "sort" ? sortBy === f.val : filterBy === f.val;
              return (
                <button
                  key={`${f.group}-${f.val}`}
                  onClick={() => f.group === "sort" ? setSortBy(f.val) : setFilterBy(f.val)}
                  style={{
                    padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: `1.5px solid ${isActive ? "var(--pink)" : "var(--border)"}`,
                    background: isActive ? "var(--pink)" : "var(--bg-card)",
                    color: isActive ? "white" : "var(--text-secondary)",
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >{f.label}</button>
              );
            })}
          </div>

          {/* Results count when filtering */}
          {(search || filterBy !== "all") && !loading && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {" · "}
              <button onClick={() => { setSearch(""); setFilterBy("all"); setSortBy("newest"); }} style={{ background: "none", border: "none", color: "var(--pink)", cursor: "pointer", fontSize: 12, padding: 0 }}>
                Clear
              </button>
            </div>
          )}

          {/* Conversation list */}
          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="ti ti-message-circle-off" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
                {search || filterBy !== "all" ? "No matches found" : "No messages yet"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {search || filterBy !== "all" ? "Try adjusting your filters" : "Clients will appear here when they message you"}
              </div>
            </div>
          ) : filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              style={{
                background: conv.unread > 0 ? "var(--pink-light)" : "var(--bg-card)",
                border: `${conv.unread > 0 ? "1.5px" : "0.5px"} solid ${conv.unread > 0 ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              }}
            >
              {/* Avatar — tap to view profile */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  className="avatar"
                  onClick={e => { e.stopPropagation(); nav(`/stylist/client/${conv.clientId}`); }}
                  style={{ width: 48, height: 48, background: "var(--avatar-bg)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", cursor: "pointer" }}
                  title="View client profile"
                >
                  {conv.client?.photoUrl
                    ? <img src={conv.client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (conv.client?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>
                {conv.unread > 0 && (
                  <span style={{
                    position: "absolute", top: -3, right: -3,
                    background: "#e53935", color: "white",
                    borderRadius: "50%", minWidth: 18, height: 18,
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid var(--bg)", boxSizing: "border-box", padding: "0 3px",
                  }}>
                    {conv.unread > 9 ? "9+" : conv.unread}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: conv.unread > 0 ? 700 : 500, cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); nav(`/stylist/client/${conv.clientId}`); }}
                  >
                    {conv.client?.name || "Client"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0, marginLeft: 8 }}>
                    {timeAgo(conv.lastMessageAt)}
                  </div>
                </div>
                <div style={{
                  fontSize: 12,
                  color: conv.unread > 0 ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: conv.unread > 0 ? 500 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {conv.lastMessage?.type === "image" ? "Sent a photo" :
                   conv.lastMessage?.type === "video_invite" ? "Started a video call" :
                   conv.lastMessage?.type === "session_ended" ? "Session ended" :
                   conv.lastMessage?.content || "No messages yet"}
                </div>
              </div>

              <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)", flexShrink: 0 }} aria-hidden="true"></i>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="messages" type="stylist" />
    </>
  );
}

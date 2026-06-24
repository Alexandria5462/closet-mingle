import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, addDoc, query, where,
  onSnapshot, doc, getDoc, updateDoc, getDocs, writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import CameraModal from "../components/CameraModal";
import VideoCall from "../components/VideoCall";
import ReportUserModal from "../components/ReportUserModal";
import { notifyClientNewMessage, notifyClientSessionEnded } from "../lib/notifications";

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle-chat");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!response.ok) throw new Error("Upload failed");
  const data = await response.json();
  return data.secure_url;
}

export default function StylistChat() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const [videoRoomUrl, setVideoRoomUrl] = useState(null);
  const [startingVideo, setStartingVideo] = useState(false);
  const [sessionDoc, setSessionDoc] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [ending, setEnding] = useState(false);
  const [closingClient, setClosingClient] = useState(false);
  const [clientClosed, setClientClosed] = useState(false);
  const [showCloset, setShowCloset] = useState(false);
  const [clientCloset, setClientCloset] = useState([]);
  const [closetLoading, setClosetLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(true);
  const bottomRef = useRef(null);

  const conversationId = [currentUser?.uid, clientId].sort().join("_");

  // Mark all messages as read when stylist opens this chat
  async function markAllRead() {
    try {
      const unreadSnap = await getDocs(
        query(collection(db, "messages"),
          where("participants", "array-contains", currentUser.uid),
          where("conversationId", "==", conversationId),
          where("read", "==", false)
        )
      );
      if (!unreadSnap.empty) {
        const batch = writeBatch(db);
        unreadSnap.docs.forEach(d => {
          if (d.data().senderId !== currentUser?.uid) {
            batch.update(d.ref, { read: true });
          }
        });
        await batch.commit();
      }
    } catch(e) { console.error("markAllRead error:", e); }
  }

  useEffect(() => {
    if (!currentUser?.uid || !clientId) return;
    let cancelled = false;

    async function checkBlockThenLoad() {
      setCheckingBlock(true);
      try {
        const blockSnap = await getDocs(
          query(collection(db, "blockedUsers"),
            where("stylistId", "==", currentUser.uid),
            where("clientId", "==", clientId)
          )
        );
        if (!blockSnap.empty) {
          if (cancelled) return;
          setIsBlocked(true);
          setCheckingBlock(false);
          // Load the client's name only — needed to show a clean blocked screen,
          // but no messages, session data, or closet are ever loaded.
          try {
            const c = await getDoc(doc(db, "users", clientId));
            if (c.exists() && !cancelled) setClient(c.data());
          } catch(e) {}
          return; // stop here — do not wire up messages, session, or closet
        }
      } catch(e) { console.error("Block check failed:", e); }
      if (cancelled) return;
      setIsBlocked(false);
      setCheckingBlock(false);
    }

    checkBlockThenLoad();
    return () => { cancelled = true; };
  }, [currentUser, clientId]);

  useEffect(() => {
    if (isBlocked || checkingBlock) return; // never wire up live data for a blocked relationship
    loadClient();
    loadSession();
    // Mark all unread messages as read immediately when chat opens
    markAllRead();
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUser.uid),
      where("conversationId", "==", conversationId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      console.error("Messages listener error:", error);
    });
    return unsub;
  }, [clientId, conversationId, isBlocked, checkingBlock]);

  async function loadClientCloset() {
    if (!clientId || isBlocked) return;
    setClosetLoading(true);
    try {
      // Query all the client's items, then filter privacy client-side.
      // A Firestore "!=" query silently excludes items missing the field,
      // which would wrongly hide older public items — so we filter in code instead,
      // matching how every other closet consumer in the app works.
      const snap = await getDocs(
        query(collection(db, "closetItems"), where("userId", "==", clientId))
      );
      setClientCloset(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !i.isPrivate));
    } catch (e) {
      console.error(e);
    }
    setClosetLoading(false);
  }

  async function closeClient() {
    if (!sessionDoc) return;
    setClosingClient(true);
    try {
      // Mark client as closed - they can view history but not message
      await updateDoc(doc(db, "chatSessions", sessionDoc.id), {
        status: "closed",
        closedAt: new Date().toISOString(),
        closedBy: currentUser.uid,
      });
      // Send system message
      await addDoc(collection(db, "messages"), {
        conversationId,
        participants: conversationId.split("_"),
        senderId: currentUser.uid,
        senderName: userProfile?.name || "",
        content: "This styling relationship has been closed by the stylist. You can still view your message history.",
        type: "session_ended",
        createdAt: new Date().toISOString(),
        read: false,
      });
      setClientClosed(true);
    } catch(e) { console.error(e); }
    setClosingClient(false);
  }

  async function loadClient() {
    const c = await getDoc(doc(db, "users", clientId));
    if (c.exists()) setClient(c.data());
  }

  async function loadSession() {
    const snap = await getDocs(
      query(
        collection(db, "chatSessions"),
        where("conversationId", "==", conversationId)
      )
    );
    if (!snap.empty) {
      const session = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setSessionDoc(session);
      setSessionStatus(session.status);

      // Listen for real-time session changes
      onSnapshot(doc(db, "chatSessions", session.id), (snap) => {
        if (snap.exists()) {
          setSessionStatus(snap.data().status);
        }
      });
    }
  }

  const MESSAGE_MAX_LENGTH = 2000;
  const [lengthWarning, setLengthWarning] = useState(false);

  async function sendMessage(content, type = "text") {
    if (!content?.trim() && type === "text") return;
    if (isBlocked) return; // hard guard — never write a message in a blocked relationship
    if (type === "text" && content.length > MESSAGE_MAX_LENGTH) {
      setLengthWarning(true);
      return;
    }
    setLengthWarning(false);
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        conversationId,
        participants: conversationId.split("_"),
        senderId: currentUser.uid,
        senderName: userProfile?.name || "",
        content: type === "text" ? content.trim().slice(0, MESSAGE_MAX_LENGTH) : content,
        type,
        createdAt: new Date().toISOString(),
        read: false,
      });
      setText("");
    } catch(e) {
      console.error("Send message error:", e);
    } finally {
      // Always unblock the input — runs whether addDoc succeeded or failed
      setSending(false);
    }
    // Fire notification after input is unblocked — non-blocking
    if (type === "text") {
      notifyClientNewMessage(clientId, currentUser.uid, userProfile?.name || "Your stylist", content).catch(() => {});
    }
  }

  async function handlePhoto(file) {
    setShowCamera(false);
    setSending(true);
    try {
      const url = await uploadToCloudinary(file);
      await sendMessage(url, "image");
    } catch (e) { console.error(e); }
    setSending(false);
  }

  async function startVideoCall() {
    setStartingVideo(true);
    try {
      const res = await fetch("/api/create-video-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json();
      if (data.roomUrl) {
        await sendMessage(
          `📹 Video call started! Join here: ${data.roomUrl}`,
          "video_invite"
        );
        setVideoRoomUrl(data.roomUrl);
      }
    } catch (e) { console.error(e); }
    setStartingVideo(false);
  }

  async function endSession() {
    if (!sessionDoc) return;
    setEnding(true);
    try {
      // Record earnings based on stylist's own session rate (80% to stylist)
      const sessionRate = userProfile?.sessionRate || null;
      const stylistEarned = sessionRate ? parseFloat((sessionRate * 0.8).toFixed(2)) : 0;
      await updateDoc(doc(db, "chatSessions", sessionDoc.id), {
        status: "ended",
        endedAt: new Date().toISOString(),
        endedBy: currentUser.uid,
        sessionFee: sessionRate || 0,
        stylistEarned,
      });

      // Send system message to client
      await addDoc(collection(db, "messages"), {
        conversationId,
        participants: conversationId.split("_"),
        senderId: currentUser.uid,
        senderName: userProfile.name,
        content: "Your stylist has completed your session. Thank you for using ClosetMingle! 💗",
        type: "session_ended",
        createdAt: new Date().toISOString(),
        read: false,
      });

      // Notify client
      notifyClientSessionEnded(clientId, currentUser.uid, userProfile?.name || "Your stylist");

      setSessionStatus("ended");
      setShowEndConfirm(false);
    } catch (e) {
      console.error("End session error:", e);
    }
    setEnding(false);
  }

  const initials = client?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "CL";
  const sessionEnded = sessionStatus === "ended";
  const isSessionClient = client?.subscriptionTier === "session";

  // Blocked relationship — show a minimal explanation screen only.
  // No messages, no closet, no input bar, no booking actions are rendered at all.
  if (checkingBlock) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
        <span className="spinner"></span>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div className="header">
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Unavailable</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
          <i className="ti ti-ban" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 16 }} aria-hidden="true"></i>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>This conversation is unavailable</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 280 }}>
            You don't have access to message, view, or build outfits for this client right now.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {videoRoomUrl && (
        <VideoCall roomUrl={videoRoomUrl} onEnd={() => setVideoRoomUrl(null)} />
      )}

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>End this session?</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {isSessionClient
                  ? "This client is on a Pay Per Session plan. Ending the session will remove their chat access immediately."
                  : "Are you sure you want to end this styling session?"
                }
              </div>
            </div>
            {isSessionClient && userProfile?.sessionRate && (
              <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46" }}>
                You will earn <strong>${(userProfile.sessionRate * 0.8).toFixed(2)}</strong> for this session (80% of your ${userProfile.sessionRate} rate · ClosetMingle keeps 20%)
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn-outline btn-sm"
                onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, marginTop: 0 }}
              >
                Keep chatting
              </button>
              <button
                onClick={endSession}
                disabled={ending}
                style={{ flex: 1, background: "var(--success)", color: "white", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                {ending ? <span className="spinner"></span> : "End session"}
              </button>
              {/* Close client button */}
              {!clientClosed && (
                <button
                  onClick={closeClient}
                  disabled={closingClient}
                  style={{ flex: 1, background: "none", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {closingClient ? <span className="spinner"></span> : "Close client"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closed client banner */}
      {clientClosed && (
        <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "10px 16px", fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
          You have closed this client relationship. The client can view message history only.
        </div>
      )}

      <div className="header" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: "8px 16px 0" }}>
        {/* Top row — back, avatar, name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="avatar" onClick={() => nav(`/stylist/client/${clientId}`)}
            style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
            {client?.photoUrl
              ? <img src={client.photoUrl} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => nav(`/stylist/client/${clientId}`)}>
            <div style={{ fontSize: 14, fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client?.name || "Client"}</div>
            <div style={{ fontSize: 10, color: sessionEnded ? "var(--text-tertiary)" : "var(--success)" }}>
              {sessionEnded ? "Session ended" : "Active"}
            </div>
          </div>
          {/* Video — icon only to save space */}
          {!sessionEnded && !clientClosed && (
            <button onClick={startVideoCall} disabled={startingVideo}
              style={{ background: "var(--pink)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {startingVideo
                ? <span style={{ width: 14, height: 14, border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%", display: "inline-block" }}></span>
                : <i className="ti ti-video" style={{ fontSize: 16 }} aria-hidden="true"></i>}
            </button>
          )}
          {/* Report client — icon only */}
          {!sessionEnded && (
            <button onClick={() => setShowReport(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-flag" style={{ fontSize: 18 }} aria-hidden="true"></i>
            </button>
          )}
          {sessionEnded && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 500, flexShrink: 0 }}>Completed</span>}
        </div>

        {/* Second row — action buttons */}
        {!sessionEnded && (
          <div style={{ display: "flex", gap: 6, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            <button onClick={() => nav(`/stylist/build-outfit/${clientId}`)}
              style={{ flexShrink: 0, padding: "5px 12px", background: "var(--pink)", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 11, color: "white", fontFamily: "inherit", fontWeight: 500 }}>
              Build Outfit
            </button>
            <button onClick={() => { setShowCloset(!showCloset); if (!clientCloset.length) loadClientCloset(); }}
              style={{ flexShrink: 0, padding: "5px 12px", background: showCloset ? "var(--avatar-bg)" : "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontFamily: "inherit" }}>
              {showCloset ? "Hide closet" : "Closet"}
            </button>
            {isSessionClient && (
              <button onClick={() => setShowEndConfirm(true)}
                style={{ flexShrink: 0, padding: "5px 12px", background: "none", border: "1px solid #059669", borderRadius: 20, cursor: "pointer", fontSize: 11, color: "#059669", fontFamily: "inherit", fontWeight: 500 }}>
                End Session
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: sessionEnded ? 20 : (showCloset ? 180 : 80) }}>

        {/* Session ended banner */}
        {sessionEnded && (
          <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#065f46" }}>
            Session completed · Earnings added to your analytics
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 14 }}>
              {isSessionClient
                ? `Starting a Pay Per Session with ${client?.name || "client"}`
                : `New message from ${client?.name || "client"}`
              }
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg-row${m.senderId === currentUser?.uid ? " me" : ""}`}>
            {m.senderId !== currentUser?.uid && (
              <div className="avatar" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 28, height: 28, fontSize: 11, flexShrink: 0, overflow: "hidden" }}>
                {client?.photoUrl
                  ? <img src={client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials
                }
              </div>
            )}
            <div style={{ minWidth: 0, maxWidth: "75%" }}>
              {m.type === "image" ? (
                <img src={m.content} alt="shared" style={{ maxWidth: 200, borderRadius: 12, display: "block" }} />
              ) : m.type === "video_invite" ? (
                <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, color: "var(--pink-dark)", marginBottom: 8 }}>Video call started</div>
                  <button className="btn-pink btn-sm" onClick={() => { const url = m.content.split("Join here: ")[1]; if (url) setVideoRoomUrl(url); }}>
                    Join Video Call
                  </button>
                </div>
              ) : m.type === "session_ended" ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#065f46" }}>
                  {m.content}
                </div>
              ) : m.type === "outfit_suggestion" ? (
                <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: 14, padding: 10, maxWidth: 260 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pink-dark)", marginBottom: 8, letterSpacing: 0.3 }}>Outfit Suggestion</div>
                  <div style={{ display: "grid", gridTemplateColumns: (m.outfitItems?.length || 0) <= 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 4, marginBottom: 6 }}>
                    {(m.outfitItems || []).map((item, i) => (
                      (item.imageUrl || item.fallbackUrl)
                        ? <img
                            key={i}
                            src={item.imageUrl || item.fallbackUrl}
                            alt={item.name}
                            onError={e => { if (item.fallbackUrl && e.target.src !== item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                            style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }}
                          />
                        : <div key={i} style={{ width: "100%", aspectRatio: "1", background: "var(--avatar-bg)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-hanger" style={{ color: "var(--text-tertiary)", fontSize: 18 }} aria-hidden="true"></i>
                          </div>
                    ))}
                  </div>
                  {(m.outfitItems || []).length > 0 && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                      {m.outfitItems.map(i => i.name).join(" · ")}
                    </div>
                  )}
                  {m.note && (
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, paddingTop: 6, borderTop: "0.5px solid var(--border)" }}>{m.note}</div>
                  )}
                </div>
              ) : (
                <div className={`msg-bubble${m.senderId === currentUser?.uid ? " msg-me" : " msg-them"}`}>
                  {m.content}
                </div>
              )}
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2, textAlign: m.senderId === currentUser?.uid ? "right" : "left" }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Bottom bar — closet tray + input bar in ONE fixed container, no gap */}
      {!sessionEnded && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", zIndex: 100, background: "var(--bg-card)", borderTop: "0.5px solid var(--border)" }}>

          {/* Closet tray — only shown when open, sits directly above input */}
          {showCloset && (
            <div style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 4px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  {client?.name || "Client"}'s closet
                </div>
                <button
                  onClick={() => setShowCloset(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 18, padding: 0, lineHeight: 1 }}
                  aria-label="Close closet"
                >✕</button>
              </div>
              <div style={{ padding: "0 14px 10px" }}>
                {closetLoading ? (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading...</div>
                ) : clientCloset.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>No public items yet</div>
                ) : (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                    {clientCloset.map((item, idx) => (
                      <div key={item.id} style={{ flexShrink: 0, textAlign: "center", cursor: "pointer" }} onClick={() => setLightboxIndex(idx)}>
                        <img
                          src={item.imageUrl || item.fallbackUrl}
                          alt={item.name}
                          onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: "0.5px solid var(--border)" }}
                        />
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{item.attributes?.primaryColor}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Length warning — shown only when a message exceeds the cap */}
          {lengthWarning && (
            <div style={{ padding: "0 14px 6px", fontSize: 11, color: "var(--danger)" }}>
              Messages are limited to {MESSAGE_MAX_LENGTH} characters.
            </div>
          )}

          {/* Input bar — always at the very bottom */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
            <button onClick={() => setShowCamera(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <i className="ti ti-photo" style={{ fontSize: 22 }} aria-hidden="true"></i>
            </button>
            <input
              className="input-field"
              style={{ flex: 1, margin: 0, padding: "10px 14px" }}
              placeholder="Send a message..."
              value={text}
              onChange={e => { setText(e.target.value); if (lengthWarning) setLengthWarning(false); }}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(text)}
            />
            <button
              onClick={() => sendMessage(text)}
              disabled={sending || !text.trim()}
              style={{ background: "var(--pink)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (!text.trim() || sending) ? 0.4 : 1 }}
            >
              <i className="ti ti-send" style={{ fontSize: 16, color: "white" }} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}

      {sessionEnded && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", background: "#f0fdf4", borderTop: "1px solid #6ee7b7", padding: "12px 16px", fontSize: 13, color: "#065f46", textAlign: "center" }}>
          Session completed · Earnings added to your analytics
        </div>
      )}

      {showCamera && (
        <CameraModal
          onPhoto={handlePhoto}
          onMultiplePhotos={files => handlePhoto(Array.from(files)[0])}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* ── Closet image lightbox carousel ── */}
      {lightboxIndex !== null && clientCloset.length > 0 && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          {/* X close */}
          <button
            onClick={() => setLightboxIndex(null)}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 42, height: 42, color: "white", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
          >✕</button>

          {/* Counter */}
          <div style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            {lightboxIndex + 1} / {clientCloset.length}
          </div>

          {/* Image */}
          <img
            src={clientCloset[lightboxIndex]?.imageUrl || clientCloset[lightboxIndex]?.fallbackUrl}
            alt={clientCloset[lightboxIndex]?.name}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "82vw", maxHeight: "65vh", borderRadius: 14, objectFit: "contain" }}
          />

          {/* Item details */}
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 16, textAlign: "center", padding: "0 24px" }}>
            <div style={{ color: "white", fontSize: 16, fontWeight: 500 }}>{clientCloset[lightboxIndex]?.name}</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4, textTransform: "capitalize" }}>
              {clientCloset[lightboxIndex]?.category}
              {clientCloset[lightboxIndex]?.attributes?.primaryColor ? ` · ${clientCloset[lightboxIndex].attributes.primaryColor}` : ""}
            </div>
          </div>

          {/* Prev / Next */}
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 24, marginTop: 24 }}>
            <button
              onClick={() => setLightboxIndex(i => (i - 1 + clientCloset.length) % clientCloset.length)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 52, height: 52, color: "white", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >←</button>
            <button
              onClick={() => setLightboxIndex(i => (i + 1) % clientCloset.length)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 52, height: 52, color: "white", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >→</button>
          </div>
        </div>
      )}

      {showReport && (
        <ReportUserModal
          reportedUserId={clientId}
          reportedUserName={client?.name}
          conversationId={conversationId}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}

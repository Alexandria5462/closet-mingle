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
  const [ending, setEnding] = useState(false);
  const [closingClient, setClosingClient] = useState(false);
  const [clientClosed, setClientClosed] = useState(false);
  const [showCloset, setShowCloset] = useState(false);
  const [clientCloset, setClientCloset] = useState([]);
  const [closetLoading, setClosetLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const bottomRef = useRef(null);

  const conversationId = [currentUser?.uid, clientId].sort().join("_");

  // Mark all messages as read when stylist opens this chat
  async function markAllRead() {
    try {
      const unreadSnap = await getDocs(
        query(collection(db, "messages"),
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
    loadClient();
    loadSession();
    // Mark all unread messages as read immediately when chat opens
    markAllRead();
    const q = query(
      collection(db, "messages"),
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
  }, [clientId, conversationId]);

  async function loadClientCloset() {
    if (!clientId) return;
    setClosetLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "closetItems"),
          where("userId", "==", clientId),
          where("isPrivate", "!=", true)
        )
      );
      setClientCloset(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Fallback without privacy filter if index not set
      try {
        const snap = await getDocs(
          query(collection(db, "closetItems"), where("userId", "==", clientId))
        );
        setClientCloset(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !i.isPrivate));
      } catch (e2) { console.error(e2); }
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

  async function sendMessage(content, type = "text") {
    if (!content.trim() && type === "text") return;
    setSending(true);
    await addDoc(collection(db, "messages"), {
      conversationId,
      senderId: currentUser.uid,
      senderName: userProfile?.name || "",
      content,
      type,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setText("");
    // Notify client of new message (stylist → client relationship only)
    if (type === "text") {
      notifyClientNewMessage(clientId, userProfile?.name || "Your stylist", content);
    }
    setSending(false);
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
      // Mark session as ended in Firebase
      await updateDoc(doc(db, "chatSessions", sessionDoc.id), {
        status: "ended",
        endedAt: new Date().toISOString(),
        endedBy: currentUser.uid,
      });

      // Send a system message so client sees the session ended
      await addDoc(collection(db, "messages"), {
        conversationId,
        senderId: currentUser.uid,
        senderName: userProfile.name,
        content: "Your stylist has completed your session. Thank you for using Closet Mingle! 💗",
        type: "session_ended",
        createdAt: new Date().toISOString(),
      });

      // Notify client session ended
      notifyClientSessionEnded(clientId, userProfile?.name || "Your stylist");

      // Update stylist analytics
      await updateDoc(doc(db, "users", currentUser.uid), {
        totalSessions: (userProfile?.totalSessions || 0) + 1,
        totalEarnings: (userProfile?.totalEarnings || 0) + (9.99 * 0.7),
      });

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
            {isSessionClient && (
              <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46" }}>
                You will earn <strong>${(9.99 * 0.7).toFixed(2)}</strong> for this session (70% of $9.99)
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

      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => nav(-1)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div
            className="avatar"
            onClick={() => nav(`/stylist/client/${clientId}`)}
            style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer" }}
            title="View client profile"
          >
            {client?.photoUrl
              ? <img src={client.photoUrl} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              onClick={() => nav(`/stylist/client/${clientId}`)}
            >{client?.name || "Client"}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              {isSessionClient && (
                <span style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: 10, padding: "1px 6px", fontSize: 9, color: "#065f46" }}>
                  Pay Per Session
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Video call — stylist only */}
          {!sessionEnded && !clientClosed && (
            <button
              onClick={startVideoCall}
              disabled={startingVideo}
              style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "6px 12px", color: "white", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
            >
              {startingVideo
                ? <span className="spinner" style={{ width: 14, height: 14 }}></span>
                : <><i className="ti ti-video" aria-hidden="true"></i> Video</>
              }
            </button>
          )}

          {/* View client closet button */}
          {!sessionEnded && (
            <button
              onClick={() => { setShowCloset(!showCloset); if (!clientCloset.length) loadClientCloset(); }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-primary)", fontFamily: "inherit" }}
            >
              {showCloset ? "Hide closet" : "View closet"}
            </button>
          )}

          {/* End Session button — only shows when session client */}
          {isSessionClient && !sessionEnded && (
            <button
              onClick={() => setShowEndConfirm(true)}
              style={{ background: "#059669", border: "none", borderRadius: 20, padding: "6px 12px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
            >
              End Session
            </button>
          )}

          {sessionEnded && (
            <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 500 }}>✅ Completed</span>
          )}
        </div>
      </div>

      {/* Client closet panel */}
      {showCloset && (
        <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "12px 16px", maxHeight: 220, overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: "var(--text-primary)" }}>
            {client?.name || "Client"}'s closet — visible items only
          </div>
          {closetLoading ? (
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading...</div>
          ) : clientCloset.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>No public items in closet yet</div>
          ) : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {clientCloset.map((item, idx) => (
                <div key={item.id} style={{ flexShrink: 0, textAlign: "center", cursor: "pointer" }} onClick={() => setLightboxIndex(idx)}>
                  <img
                    src={item.imageUrl || item.fallbackUrl}
                    alt={item.name}
                    onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: "0.5px solid var(--border)", transition: "transform 0.15s" }}
                  />
                  <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{item.attributes?.primaryColor}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session ended banner for stylist */}
      {sessionEnded && (
        <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", padding: "10px 16px", fontSize: 13, color: "#065f46" }}>
          ✅ Session completed · Earnings added to your analytics
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: sessionEnded ? 20 : 80 }}>
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
            <div>
              {m.type === "image" ? (
                <img src={m.content} alt="shared" style={{ maxWidth: 200, borderRadius: 12, display: "block" }} />
              ) : m.type === "video_invite" ? (
                <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, color: "var(--pink-dark)", marginBottom: 8 }}>📹 Video call started!</div>
                  <button
                    className="btn-pink btn-sm"
                    onClick={() => {
                      const url = m.content.split("Join here: ")[1];
                      if (url) setVideoRoomUrl(url);
                    }}
                  >
                    Join Video Call
                  </button>
                </div>
              ) : m.type === "session_ended" ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#065f46" }}>
                  ✅ {m.content}
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

      {/* Input bar */}
      {!sessionEnded && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", padding: "10px 14px", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", display: "flex", gap: 8, alignItems: "center", paddingBottom: "max(10px,env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => setShowCamera(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <i className="ti ti-photo" style={{ fontSize: 22 }} aria-hidden="true"></i>
          </button>
          <input
            className="input-field"
            style={{ flex: 1, margin: 0, padding: "10px 14px" }}
            placeholder="Send a message..."
            value={text}
            onChange={e => setText(e.target.value)}
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
    </>
  );
}

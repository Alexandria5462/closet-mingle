import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, addDoc, query, where,
  onSnapshot, doc, getDoc, updateDoc, getDocs, orderBy, writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import CameraModal from "../components/CameraModal";
import VideoCall from "../components/VideoCall";
import Toast from "../components/Toast";
import TipModal from "../components/TipModal";
import Reviews from "../components/Reviews";
import { notifyStylistNewMessage, notifyStylistNewClient } from "../lib/notifications";

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

export default function Chat() {
  const { stylistId } = useParams();
  const nav = useNavigate();
  const { userProfile, currentUser, updateSubscription } = useAuth();
  const [stylist, setStylist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const [videoRoomUrl, setVideoRoomUrl] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [sessionDoc, setSessionDoc] = useState(null);
  const [toast, setToast] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const bottomRef = useRef(null);

  const isFreeClient = userProfile?.accountType === "client" &&
    !["monthly", "premium_plus", "session"].includes(userProfile?.subscriptionTier);

  // Free clients cannot access chat — redirect to plans
  useEffect(() => {
    if (userProfile && isFreeClient) {
      nav("/plans", { replace: true });
    }
  }, [userProfile]);

  // Build consistent conversationId — always sort so both sides get same ID
  const conversationId = [currentUser?.uid, stylistId].sort().join("_");

  useEffect(() => {
    if (!currentUser?.uid || !stylistId) return;
    loadStylist();
    loadSessionStatus();

    // ── Real-time messages listener ───────────────────────
    // Use only where clause — no orderBy to avoid needing a composite index
    // Sort client-side instead
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      // Mark all unread messages from the stylist as read
      const unread = snap.docs.filter(d => {
        const data = d.data();
        return !data.read && data.senderId !== currentUser.uid;
      });
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => batch.update(doc(db, "messages", d.id), { read: true }));
        batch.commit().catch(() => {});
      }
    }, (error) => {
      console.error("Messages listener error:", error);
    });

    return () => unsub();
  }, [stylistId, conversationId, currentUser?.uid]);

  async function loadStylist() {
    try {
      const s = await getDoc(doc(db, "users", stylistId));
      if (s.exists()) setStylist(s.data());
      // Check if this client is blocked by the stylist
      const blockSnap = await getDocs(
        query(collection(db, "blockedUsers"),
          where("stylistId", "==", stylistId),
          where("clientId", "==", currentUser.uid)
        )
      );
      setIsBlocked(!blockSnap.empty);
    } catch (e) { console.error(e); }
  }

  async function loadSessionStatus() {
    try {
      const snap = await getDocs(
        query(
          collection(db, "chatSessions"),
          where("conversationId", "==", conversationId),
          where("clientId", "==", currentUser.uid)
        )
      );
      if (!snap.empty) {
        const session = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setSessionDoc(session);
        setSessionStatus(session.status);
        if (session.status === "ended") await updateSubscription("free");

        // Listen for real-time session status changes
        onSnapshot(doc(db, "chatSessions", session.id), async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSessionStatus(data.status);
            if (data.status === "ended") await updateSubscription("free");
          }
        });
      } else {
        // Create new session
        const newSession = await addDoc(collection(db, "chatSessions"), {
          conversationId,
          clientId: currentUser.uid,
          stylistId,
          status: "active",
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        setSessionDoc({ id: newSession.id, status: "active" });
        setSessionStatus("active");
      }
    } catch (e) { console.error("Session load error:", e); }
  }

  async function sendMessage(msgContent, type = "text") {
    if (!msgContent?.trim() && type === "text") return;
    if (sessionStatus === "ended") return;
    if (isBlocked) { setToast("You cannot message this stylist."); return; }
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        conversationId,
        senderId: currentUser.uid,
        senderName: userProfile?.name || "",
        content: msgContent,
        type,
        createdAt: new Date().toISOString(),
        read: false,
      });
      setText("");
    } catch (e) {
      console.error("Send message error:", e);
      setToast("Failed to send message. Please try again.");
    } finally {
      // Always unblock the send button — no matter what happened above
      setSending(false);
    }

    // Background tasks — fully non-blocking, never affect the input
    if (type === "text") {
      (async () => {
        try {
          const existingSession = await getDocs(
            query(collection(db, "chatSessions"),
              where("conversationId", "==", conversationId),
              where("clientId", "==", currentUser.uid)
            )
          );
          if (existingSession.empty) {
            await addDoc(collection(db, "chatSessions"), {
              conversationId,
              clientId: currentUser.uid,
              clientName: userProfile?.name || "",
              stylistId,
              status: "active",
              clientTier: userProfile?.subscriptionTier || "free",
              startedAt: new Date().toISOString(),
            });
          }
        } catch(e) {}
        try {
          notifyStylistNewMessage(stylistId, userProfile?.name || "A client", msgContent);
          const existingMsgs = await getDocs(
            query(collection(db, "messages"),
              where("conversationId", "==", conversationId),
              where("senderId", "==", currentUser.uid)
            )
          );
          if (existingMsgs.size <= 1) {
            notifyStylistNewClient(stylistId, userProfile?.name || "A client");
          }
        } catch(e) {}
      })();
    }
  }

  async function handlePhoto(file) {
    setShowCamera(false);
    setSending(true);
    try {
      const url = await uploadToCloudinary(file);
      await sendMessage(url, "image");
    } catch (e) {
      console.error(e);
      setToast("Failed to upload photo.");
    }
    setSending(false);
  }

  async function startVideoCall() {
    try {
      const res = await fetch("/api/create-video-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json();
      if (data.roomUrl) {
        await sendMessage(`Video call started. Join here: ${data.roomUrl}`, "video_invite");
        setVideoRoomUrl(data.roomUrl);
      }
    } catch (e) { console.error(e); }
  }

  const initials = stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST";
  const sessionEnded = sessionStatus === "ended" || sessionStatus === "closed";
  const sessionClosed = sessionStatus === "closed";

  return (
    <>
      {videoRoomUrl && <VideoCall roomUrl={videoRoomUrl} onEnd={() => setVideoRoomUrl(null)} />}

      {/* Blocked banner — shown when stylist has blocked this client */}
      {isBlocked && (
        <div style={{ background: "#fee2e2", borderBottom: "0.5px solid #fca5a5", padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 500 }}>
            You are unable to message this stylist.
          </div>
        </div>
      )}

      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="avatar" onClick={() => nav(`/stylist/${stylistId}`)} style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13, overflow: "hidden", cursor: "pointer" }}>
            {stylist?.photoUrl
              ? <img src={stylist.photoUrl} alt={stylist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div onClick={() => nav(`/stylist/${stylistId}`)} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stylist?.name || "Stylist"}</div>
            <div style={{ fontSize: 11, color: sessionEnded ? "var(--text-tertiary)" : "var(--success)" }}>
              {sessionEnded ? "Session ended" : "Active"}
            </div>
          </div>
        </div>
        {!sessionEnded && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowCamera(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <i className="ti ti-photo" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </button>
            <button onClick={() => setShowTip(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <i className="ti ti-heart-handshake" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </button>
          </div>
        )}
      </div>

      {sessionEnded && (
        <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "12px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            {sessionClosed ? "This stylist has closed your relationship" : "Your session has ended"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowReviewPrompt(true)} style={{ flex: 1, padding: "8px 12px", background: "var(--avatar-bg)", border: "1px solid var(--pink)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, color: "var(--pink-dark)", fontFamily: "inherit", fontWeight: 500 }}>Leave a review</button>
            <button onClick={() => nav("/plans")} style={{ flex: 1, padding: "8px 12px", background: "var(--pink)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, color: "white", fontFamily: "inherit", fontWeight: 500 }}>Upgrade</button>
          </div>
        </div>
      )}
      {showReviewPrompt && (
        <div className="modal-overlay" onClick={() => setShowReviewPrompt(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>How was your session?</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>Share your experience with {stylist?.name}</div>
            <Reviews targetUserId={stylistId} targetUserName={stylist?.name} />
            <button className="btn-outline" onClick={() => setShowReviewPrompt(false)} style={{ marginTop: 8 }}>Close</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: sessionEnded ? 20 : 90 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 14 }}>Start your styling session!</div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg-row${m.senderId === currentUser?.uid ? " me" : ""}`}>
            {m.senderId !== currentUser?.uid && (
              <div className="avatar" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)", width: 28, height: 28, fontSize: 11, flexShrink: 0, overflow: "hidden" }}>
                {stylist?.photoUrl
                  ? <img src={stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  <button className="btn-pink btn-sm" onClick={() => {
                    const url = m.content.split("Join here: ")[1];
                    if (url) setVideoRoomUrl(url);
                  }}>
                    Join Video Call
                  </button>
                </div>
              ) : m.type === "session_ended" ? (
                <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
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

      {/* Input bar */}
      {!sessionEnded && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", padding: "10px 14px", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", display: "flex", gap: 8, alignItems: "center", paddingBottom: "max(10px,env(safe-area-inset-bottom))" }}>
          <button onClick={() => setShowCamera(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
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
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {showTip && stylist && (
        <TipModal
          stylistId={stylistId}
          stylistName={stylist.name}
          conversationId={conversationId}
          onClose={() => setShowTip(false)}
          onSuccess={() => { setShowTip(false); setToast("Tip sent!"); }}
        />
      )}
    </>
  );
}

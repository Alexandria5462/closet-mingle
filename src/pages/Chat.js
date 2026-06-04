import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, doc, getDoc, updateDoc, getDocs
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
  const [startingVideo, setStartingVideo] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null); // null | "active" | "ended"
  const [sessionDoc, setSessionDoc] = useState(null);
  const bottomRef = useRef(null);

  const conversationId = [currentUser?.uid, stylistId].sort().join("_");
  const isSessionUser = userProfile?.subscriptionTier === "session";

  useEffect(() => {
    loadStylist();
    loadSessionStatus();
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [stylistId, conversationId]);

  async function loadStylist() {
    const s = await getDoc(doc(db, "users", stylistId));
    if (s.exists()) setStylist(s.data());
  }

  async function loadSessionStatus() {
    if (!isSessionUser) return;
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

      // If session ended revert to free automatically
      if (session.status === "ended") {
        await updateSubscription("free");
      }
    } else if (isSessionUser) {
      // Create a new session record when first opening chat
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

    // Also listen for real-time session status changes
    // So when stylist ends session client sees it instantly
    const sessionSnap = await getDocs(
      query(collection(db, "chatSessions"), where("conversationId", "==", conversationId))
    );
    if (!sessionSnap.empty) {
      const sessionId = sessionSnap.docs[0].id;
      onSnapshot(doc(db, "chatSessions", sessionId), async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSessionStatus(data.status);
          if (data.status === "ended") {
            // Revert to free instantly when stylist ends session
            await updateSubscription("free");
          }
        }
      });
    }
  }

  async function sendMessage(content, type = "text") {
    if (!content.trim() && type === "text") return;
    if (sessionStatus === "ended") return; // Cannot send after session ends
    setSending(true);
    await addDoc(collection(db, "messages"), {
      conversationId,
      senderId: currentUser.uid,
      senderName: userProfile.name,
      content,
      type,
      createdAt: new Date().toISOString(),
    });
    setText("");
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

  const initials = stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST";
  const sessionEnded = sessionStatus === "ended";

  return (
    <>
      {videoRoomUrl && (
        <VideoCall roomUrl={videoRoomUrl} onEnd={() => setVideoRoomUrl(null)} />
      )}

      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => nav(-1)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="avatar" style={{ background: "#E1F5EE", color: "#085041", width: 36, height: 36, fontSize: 13, overflow: "hidden" }}>
            {stylist?.photoUrl
              ? <img src={stylist.photoUrl} alt={stylist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stylist?.name || "Stylist"}</div>
            <div style={{ fontSize: 11, color: sessionEnded ? "var(--text-tertiary)" : "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
              {sessionEnded ? "Session ended" : <><span className="online-dot" style={{ width: 6, height: 6 }}></span>Active</>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!sessionEnded && (
            <button
              onClick={() => setShowCamera(true)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="Share photo"
            >
              <i className="ti ti-photo" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </button>
          )}
        </div>
      </div>

      {/* Session ended banner */}
      {sessionEnded && (
        <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", padding: "10px 16px", fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⏰ Your session has ended</span>
          <button
            onClick={() => nav("/plans")}
            style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
          >
            Upgrade →
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: sessionEnded ? 20 : 80 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 14 }}>Start your styling session!</div>
            {isSessionUser && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                Your session is active and will end when your stylist completes it
              </div>
            )}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg-row${m.senderId === currentUser?.uid ? " me" : ""}`}>
            {m.senderId !== currentUser?.uid && (
              <div className="avatar" style={{ background: "#E1F5EE", color: "#085041", width: 28, height: 28, fontSize: 11, flexShrink: 0, overflow: "hidden" }}>
                {stylist?.photoUrl
                  ? <img src={stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials
                }
              </div>
            )}
            <div>
              {m.type === "image" ? (
                <img src={m.content} alt="shared" style={{ maxWidth: 200, borderRadius: 12, display: "block" }} />
              ) : m.type === "video_invite" ? (
                <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: 12, padding: "10px 14px" }}>
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
                <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
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

      {/* Input bar — hidden when session ended */}
      {!sessionEnded && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", padding: "10px 14px", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", display: "flex", gap: 8, alignItems: "center", paddingBottom: "max(10px,env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => setShowCamera(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            aria-label="Attach photo"
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
            aria-label="Send"
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
    </>
  );
}

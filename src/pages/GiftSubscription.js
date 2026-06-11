import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import Toast from "../components/Toast";
import TabBar from "../components/TabBar";

const GIFT_PLANS = [
  { id: "gift_monthly", name: "Premium",  duration: "1 month",  price: "$9.99",  color: "var(--pink-light)" },
  { id: "gift_3month",  name: "Premium",  duration: "3 months", price: "$29.99", color: "var(--pink-light)", badge: "Best value" },
  { id: "gift_6month",  name: "Premium",  duration: "6 months", price: "$54.99", color: "var(--pink-light)", badge: "Save 8%" },
];

export default function GiftSubscription() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [selected, setSelected] = useState("gift_monthly");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  async function sendGift() {
    if (!recipientEmail || !recipientName) {
      setToast("Please fill in recipient name and email.");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "gifts"), {
        fromUserId: currentUser.uid,
        fromUserName: userProfile?.name || "",
        fromUserEmail: userProfile?.email || "",
        recipientEmail,
        recipientName,
        plan: selected,
        message: message.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setDone(true);
    } catch (e) {
      setToast("Failed to send gift. Please try again.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <i className="ti ti-gift" style={{ fontSize: 64, color: "var(--pink)", display: "block", marginBottom: 16 }} aria-hidden="true"></i>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Gift sent!</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              {recipientName} will receive their Premium gift at {recipientEmail}.
            </div>
            <button className="btn-pink" onClick={() => nav("/home")} style={{ width: "auto", padding: "12px 32px" }}>Back to home</button>
          </div>
        </div>
        <TabBar active="account" type="client" />
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <i className="ti ti-gift" style={{ fontSize: 48, color: "var(--pink)", display: "block", marginBottom: 8 }} aria-hidden="true"></i>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Give the gift of style</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Send a ClosetMingle Premium subscription to someone special</div>
          </div>

          {/* Plan selection */}
          <div className="section-label">Choose a plan</div>
          {GIFT_PLANS.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{ background: selected === p.id ? p.color : "var(--bg-card)", border: `2px solid ${selected === p.id ? "var(--pink)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name} — {p.duration}</div>
                  {p.badge && <span className="badge badge-pink" style={{ fontSize: 9, marginTop: 4 }}>{p.badge}</span>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--pink-dark)" }}>{p.price}</div>
              </div>
            </div>
          ))}

          {/* Recipient info */}
          <div className="section-label" style={{ marginTop: 8 }}>Recipient details</div>
          <input className="input-field" placeholder="Recipient's name *" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
          <input className="input-field" type="email" placeholder="Recipient's email *" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
          <textarea
            className="input-field"
            placeholder="Add a personal message (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ resize: "none", fontFamily: "inherit" }}
          />

          <button className="btn-pink" onClick={sendGift} disabled={sending || !recipientEmail || !recipientName}>
            {sending ? <span className="spinner"></span> : "Send gift"}
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 10 }}>
            Payment processed by Stripe. The recipient will get an email with instructions to redeem their gift.
          </p>
        </div>
      </div>

      <TabBar active="account" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

const TIP_AMOUNTS = [2, 5, 10, 20];

export default function TipModal({ stylistId, stylistName, conversationId, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const finalAmount = useCustom ? parseFloat(custom) || 0 : amount;

  async function sendTip() {
    if (finalAmount <= 0) return;
    setSending(true);
    try {
      await addDoc(collection(db, "tips"), {
        fromUserId: currentUser.uid,
        fromUserName: userProfile?.name || "Client",
        toStylistId: stylistId,
        toStylistName: stylistName,
        conversationId,
        amount: finalAmount,
        stylistAmount: parseFloat((finalAmount * 0.7).toFixed(2)),
        platformAmount: parseFloat((finalAmount * 0.3).toFixed(2)),
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      setDone(true);
    } catch (e) {
      console.error("Tip error:", e);
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💗</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Tip sent!</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            ${finalAmount.toFixed(2)} sent to {stylistName}. They will love it!
          </div>
          <button className="btn-pink" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💝</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Tip your stylist</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Show {stylistName} some love for a great session!
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          {TIP_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setAmount(a); setUseCustom(false); }}
              style={{
                padding: "10px 0", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500,
                border: `2px solid ${!useCustom && amount === a ? "var(--pink)" : "var(--border)"}`,
                background: !useCustom && amount === a ? "var(--pink-light)" : "var(--bg-card)",
                color: !useCustom && amount === a ? "var(--pink-dark)" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              ${a}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Custom amount</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: 14 }}>$</span>
            <input
              className="input-field"
              type="number"
              placeholder="0.00"
              value={custom}
              onChange={e => { setCustom(e.target.value); setUseCustom(true); }}
              style={{ paddingLeft: 28, marginBottom: 0 }}
            />
          </div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--text-secondary)" }}>
          {stylistName} receives <strong style={{ color: "var(--success)" }}>${(finalAmount * 0.7).toFixed(2)}</strong> (70% of tip)
        </div>
        <button className="btn-pink" onClick={sendTip} disabled={sending || finalAmount <= 0}>
          {sending ? <span className="spinner"></span> : `Send $${finalAmount.toFixed(2)} tip`}
        </button>
        <button className="btn-outline" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  );
}

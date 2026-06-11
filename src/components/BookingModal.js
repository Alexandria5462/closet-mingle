import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

/**
 * BookingModal
 * Shows when a client taps "Book" or "Work with [Stylist]"
 * Displays the stylist's rate, lets client choose session type,
 * then initiates Stripe Checkout for payment
 */
export default function BookingModal({ stylist, stylistId, onClose }) {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const monthlyRate = stylist?.monthlyRate || null;
  const sessionRate  = stylist?.sessionRate  || null;

  const options = [
    monthlyRate && {
      id: "monthly",
      label: "Monthly styling",
      price: monthlyRate,
      period: "/mo",
      description: "Unlimited messaging for a full month",
      icon: "🗓️",
    },
    sessionRate && {
      id: "session",
      label: "Single session",
      price: sessionRate,
      period: "/session",
      description: "One 24-hour styling session",
      icon: "✨",
    },
  ].filter(Boolean);

  async function handleBook() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      // If Stripe is not yet activated, skip payment and go straight to chat
      // This allows the app to work fully before Stripe goes live
      const stripeReady = stylist?.stripeOnboardingComplete && stylist?.stripeAccountId;

      if (!stripeReady) {
        // Create booking record in Firestore (no payment yet)
        await addDoc(collection(db, "bookings"), {
          clientId: currentUser.uid,
          clientName: userProfile?.name || "",
          stylistId,
          stylistName: stylist?.name || "",
          type: selected.id,
          amount: selected.price,
          stylistAmount: parseFloat((selected.price * 0.8).toFixed(2)),
          platformAmount: parseFloat((selected.price * 0.2).toFixed(2)),
          status: "pending_stripe_activation",
          note: "Payment will be collected once Stripe is activated",
          createdAt: new Date().toISOString(),
        });
        // Go straight to chat — payment collected later
        nav(`/chat/${stylistId}`);
        return;
      }

      // ── Stripe is live — create checkout session ──────────────
      const bookingRef = await addDoc(collection(db, "bookings"), {
        clientId: currentUser.uid,
        clientName: userProfile?.name || "",
        stylistId,
        stylistName: stylist?.name || "",
        type: selected.id,
        amount: selected.price,
        stylistAmount: parseFloat((selected.price * 0.8).toFixed(2)),
        platformAmount: parseFloat((selected.price * 0.2).toFixed(2)),
        status: "pending_payment",
        createdAt: new Date().toISOString(),
      });

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingRef.id,
          clientId: currentUser.uid,
          stylistId,
          stylistName: stylist?.name || "",
          stylistStripeAccountId: stylist?.stripeAccountId || null,
          type: selected.id,
          amount: selected.price,
          label: selected.label,
          successUrl: `${window.location.origin}/chat/${stylistId}?booked=true`,
          cancelUrl: `${window.location.origin}/stylist/${stylistId}`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout. Please try again.");
      }
    } catch(e) {
      console.error("Booking error:", e);
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
            {stylist?.photoUrl
              ? <img src={stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (stylist?.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)
            }
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{stylist?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{stylist?.specialty || "Personal Stylist"}</div>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Choose a booking type</div>

        {options.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: "var(--text-secondary)" }}>
            This stylist hasn't set their rates yet. Send them a message to get started.
          </div>
        ) : (
          options.map(opt => (
            <div
              key={opt.id}
              onClick={() => setSelected(opt)}
              style={{
                background: "var(--bg-card)",
                border: `2px solid ${selected?.id === opt.id ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{opt.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--pink)" }}>${opt.price}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{opt.period}</div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Earnings breakdown */}
        {selected && (
          <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Stylist earns</span>
              <strong style={{ color: "var(--success)" }}>${(selected.price * 0.8).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>ClosetMingle fee (20%)</span>
              <span>${(selected.price * 0.2).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid var(--border)", marginTop: 6, paddingTop: 6, fontWeight: 500 }}>
              <span>You pay</span>
              <strong>${selected.price.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#991b1b" }}>
            {error}
          </div>
        )}

        {options.length > 0 && (
          <button
            className="btn-pink"
            onClick={handleBook}
            disabled={!selected || loading}
            style={{ marginBottom: 0 }}
          >
            {loading ? "Redirecting to payment..." : selected ? `Book for $${selected.price}` : "Select a booking type"}
          </button>
        )}

        {options.length === 0 && (
          <button className="btn-pink" onClick={() => { onClose(); nav(`/chat/${stylistId}`); }}>
            Send a message
          </button>
        )}

        <button className="btn-outline" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>

        <div style={{ fontSize: 10, color: "var(--text-tertiary)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          {stylist?.stripeOnboardingComplete
            ? "Payments processed securely by Stripe. Tips are always 100% to your stylist."
            : "🚧 Payment processing coming soon — you can still connect with this stylist now."
          }
        </div>
      </div>
    </div>
  );
}

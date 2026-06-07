import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function Reviews({ targetUserId, targetUserName }) {
  const { currentUser, userProfile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canReview = currentUser && currentUser.uid !== targetUserId && userProfile?.accountType === "client";

  useEffect(() => {
    if (targetUserId) loadReviews();
  }, [targetUserId]);

  async function loadReviews() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "reviews"), where("targetUserId", "==", targetUserId))
      );
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function submitReview() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        targetUserId,
        reviewerId: currentUser.uid,
        reviewerName: userProfile?.name || "Client",
        reviewerPhoto: userProfile?.photoUrl || "",
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });

      // Recalculate and update the stylist's rating on their user document
      // so stylist cards stay in sync with the reviews collection
      const allReviews = await getDocs(
        query(collection(db, "reviews"), where("targetUserId", "==", targetUserId))
      );
      const allRatings = allReviews.docs.map(d => d.data().rating || 0);
      const newAvg = allRatings.length > 0
        ? parseFloat((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1))
        : 0;
      await updateDoc(doc(db, "users", targetUserId), {
        rating: newAvg,
        reviewCount: allRatings.length,
      });

      setSubmitted(true);
      setShowForm(false);
      await loadReviews();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      {/* Summary */}
      {reviews.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{avgRating}</div>
            <div style={{ fontSize: 16, color: "#f59e0b" }}>{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>from verified sessions</div>
          </div>
        </div>
      )}

      {/* Write review button */}
      {canReview && !submitted && !showForm && (
        <button className="btn-outline btn-sm" onClick={() => setShowForm(true)} style={{ marginBottom: 14, marginTop: 0 }}>
          Write a review
        </button>
      )}

      {/* Review form */}
      {showForm && (
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Rate your session with {targetUserName}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: n <= rating ? "#f59e0b" : "var(--border)" }}>
                ★
              </button>
            ))}
          </div>
          <textarea
            className="input-field"
            placeholder="Share your experience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            style={{ resize: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline btn-sm" onClick={() => setShowForm(false)} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
            <button className="btn-pink btn-sm" onClick={submitReview} disabled={submitting || !comment.trim()} style={{ flex: 1 }}>
              {submitting ? <span className="spinner"></span> : "Submit review"}
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#065f46" }}>
          ✅ Review submitted! Thank you.
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
          No reviews yet. Be the first to leave one!
        </div>
      ) : reviews.map(r => (
        <div key={r.id} style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div className="avatar" style={{ width: 32, height: 32, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 11, overflow: "hidden", flexShrink: 0 }}>
              {r.reviewerPhoto
                ? <img src={r.reviewerPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : r.reviewerName?.charAt(0)
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.reviewerName}</div>
              <div style={{ fontSize: 11, color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-tertiary)" }}>
              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.comment}</div>
        </div>
      ))}
    </div>
  );
}

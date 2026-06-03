import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function Reviews({ targetUserId, targetUserName }) {
  const { userProfile, currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUserId) {
      fetchReviews();
      checkCanReview();
    }
  }, [targetUserId]);

  async function fetchReviews() {
    setLoading(true);
    const q = query(collection(db, "reviews"), where("targetUserId", "==", targetUserId));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setReviews(data);
    setLoading(false);
  }

  async function checkCanReview() {
    if (!currentUser || currentUser.uid === targetUserId) return;

    // Check if they have had a session together
    const convId = [currentUser.uid, targetUserId].sort().join("_");
    const msgSnap = await getDocs(query(collection(db, "messages"), where("conversationId", "==", convId)));
    const hadSession = !msgSnap.empty;

    // Check if already reviewed
    const reviewSnap = await getDocs(query(
      collection(db, "reviews"),
      where("reviewerId", "==", currentUser.uid),
      where("targetUserId", "==", targetUserId)
    ));
    const hasReviewed = !reviewSnap.empty;
    setAlreadyReviewed(hasReviewed);
    setCanReview(hadSession && !hasReviewed);
  }

  async function submitReview() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        targetUserId,
        targetUserName,
        reviewerId: currentUser.uid,
        reviewerName: userProfile?.name || "User",
        reviewerPhoto: userProfile?.photoUrl || "",
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });
      setComment("");
      setAlreadyReviewed(true);
      setCanReview(false);
      await fetchReviews();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      {/* Rating summary */}
      {reviews.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
          <div style={{ fontSize: 32, fontWeight: 600, color: "var(--text-primary)" }}>{avgRating}</div>
          <div>
            <div style={{ fontSize: 14, color: "#f59e0b" }}>{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      )}

      {/* Leave a review */}
      {canReview && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Leave a review</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: star <= rating ? "#f59e0b" : "#d1d5db" }}>★</button>
            ))}
          </div>
          <textarea
            className="input-field"
            placeholder="Share your experience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            style={{ resize: "none", fontFamily: "inherit", marginBottom: 8 }}
          />
          <button className="btn-pink btn-sm" onClick={submitReview} disabled={submitting || !comment.trim()}>
            {submitting ? <span className="spinner"></span> : "Submit review"}
          </button>
        </div>
      )}

      {alreadyReviewed && (
        <div style={{ fontSize: 12, color: "var(--success)", marginBottom: 12 }}>✅ You have already reviewed this person.</div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>No reviews yet.</div>
      ) : reviews.map(review => (
        <div key={review.id} style={{ padding: "12px 0", borderBottom: "0.5px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div className="avatar" style={{ width: 32, height: 32, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 12 }}>
              {review.reviewerPhoto
                ? <img src={review.reviewerPhoto} alt={review.reviewerName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                : review.reviewerName?.slice(0, 2).toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{review.reviewerName}</div>
              <div style={{ fontSize: 11, color: "#f59e0b" }}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{review.comment}</div>
        </div>
      ))}
    </div>
  );
}

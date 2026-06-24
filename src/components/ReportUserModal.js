import React, { useState, useEffect } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

/**
 * ReportUserModal
 * Lets a client or stylist report another user for inappropriate
 * behavior, harassment, scam attempts, or other safety concerns.
 * Writes to a `reports` collection for manual review.
 *
 * Usage: <ReportUserModal reportedUserId={...} reportedUserName={...} onClose={...} />
 */
const REASONS = [
  "Harassment or abusive language",
  "Inappropriate or unsafe content",
  "Asked to pay or communicate outside the app",
  "Suspected scam or fake profile",
  "Spam or unwanted solicitation",
  "Other",
];

export default function ReportUserModal({ reportedUserId, reportedUserName, conversationId, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [checkingPrior, setCheckingPrior] = useState(true);

  // Light duplicate-report guard — checks if this reporter already
  // has a pending report open against this exact user.
  // This is informational only, not a hard block — legitimate repeat
  // concerns (e.g. ongoing harassment) should still be reportable.
  useEffect(() => {
    if (!currentUser?.uid || !reportedUserId) { setCheckingPrior(false); return; }
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "reports"),
            where("reporterId", "==", currentUser.uid),
            where("reportedUserId", "==", reportedUserId),
            where("status", "==", "pending")
          )
        );
        setAlreadyReported(!snap.empty);
      } catch(e) { /* fail silently — not critical */ }
      setCheckingPrior(false);
    })();
  }, [currentUser, reportedUserId]);

  async function submitReport() {
    if (!reason) { setError("Please select a reason for this report."); return; }
    setSubmitting(true);
    setError("");
    try {
      await addDoc(collection(db, "reports"), {
        reportedUserId,
        reportedUserName: reportedUserName || "",
        reporterId: currentUser.uid,
        reporterName: userProfile?.name || "",
        reporterAccountType: userProfile?.accountType || "",
        conversationId: conversationId || null,
        reason,
        details: details.trim(),
        status: "pending", // pending | reviewed | resolved
        createdAt: new Date().toISOString(),
      });

      // NOTE: Auto-suspension is handled server-side by the `autoSuspendOnReports`
      // Cloud Function (functions/index.js), which runs with admin privileges and
      // suspends an account once it has 3+ pending reports. The client intentionally
      // does NOT write suspension fields here — doing so would require giving every
      // user write access to other users' documents, which is a security hole.

      setSubmitted(true);
    } catch(e) {
      console.error("Report submission failed:", e);
      setError("Failed to submit report. Please try again.");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
          <i className="ti ti-shield-check" style={{ fontSize: 44, color: "var(--success)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Report submitted</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
            Thank you for letting us know. Our team will review this within 24–48 hours. Your safety matters to us.
          </div>
          <button className="btn-pink" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Report {reportedUserName || "this user"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
          This report is confidential. {reportedUserName || "This user"} will not be notified.
        </div>

        {!checkingPrior && alreadyReported && (
          <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--text-secondary)" }}>
            You already have a report pending review for this user. You can still submit another if this is a new or ongoing concern.
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>What's going on?</div>
        {REASONS.map(r => (
          <div
            key={r}
            onClick={() => setReason(r)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6,
              border: `1.5px solid ${reason === r ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: reason === r ? "var(--pink-light)" : "var(--bg-card)",
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${reason === r ? "var(--pink)" : "var(--border)"}`,
              background: reason === r ? "var(--pink)" : "transparent",
            }} />
            <span style={{ fontSize: 13 }}>{r}</span>
          </div>
        ))}

        <div style={{ fontSize: 13, fontWeight: 500, margin: "12px 0 8px" }}>Additional details (optional)</div>
        <textarea
          className="input-field"
          placeholder="Anything else we should know?"
          value={details}
          onChange={e => setDetails(e.target.value)}
          rows={3}
          style={{ resize: "none", fontFamily: "inherit", fontSize: 13, marginBottom: 14 }}
        />

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button className="btn-pink" onClick={submitReport} disabled={submitting} style={{ marginBottom: 8 }}>
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-tertiary)", fontFamily: "inherit", width: "100%", padding: "8px 0" }}>
          Cancel
        </button>

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 8 }}>
          If you feel unsafe right now, please contact local authorities directly.
        </div>
      </div>
    </div>
  );
}

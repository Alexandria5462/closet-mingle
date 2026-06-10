import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

export default function Referral() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (currentUser?.uid) loadReferral();
  }, [currentUser]);

  async function loadReferral() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "referrals", currentUser.uid));
      let code = "";
      if (snap.exists()) {
        code = snap.data().code;
      } else {
        code = `CM${currentUser.uid.slice(0, 6).toUpperCase()}`;
        await setDoc(doc(db, "referrals", currentUser.uid), {
          userId: currentUser.uid,
          userName: userProfile?.name || "",
          code,
          createdAt: new Date().toISOString(),
          totalReferrals: 0,
          rewardsEarned: 0,
        });
      }
      setReferralCode(code);

      const refSnap = await getDocs(
        query(collection(db, "referrals"), where("referredBy", "==", currentUser.uid))
      );
      setReferrals(refSnap.docs.map(d => d.data()));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const shareUrl = `https://closetmingle.com?ref=${referralCode}`;
  const shareText = `Join me on ClosetMingle — personal styling from your own wardrobe! Use my code ${referralCode} and get 72 hours of Premium free when you sign up!\n${shareUrl}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setToast("Referral link copied!");
    } catch (e) { console.error(e); }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join ClosetMingle!", text: shareText, url: shareUrl });
      } catch (e) { }
    }
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
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Invite friends</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
              Share your code — the person who signs up gets <strong>72 hours of Premium free</strong>. New accounts only, one use per email.
            </div>
          </div>

          {/* Referral code display */}
          <div style={{ background: "var(--avatar-bg)", border: "2px dashed var(--pink)", borderRadius: "var(--radius)", padding: 20, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--pink-dark)", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Your referral code</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--pink-dark)", letterSpacing: 4 }}>{referralCode}</div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Friends invited</div>
              <div className="stat-val">{referrals.length}</div>
            </div>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Hours earned</div>
              <div className="stat-val">{referrals.length * 72}h</div>
            </div>
          </div>

          {/* Share buttons */}
          {navigator.share && (
            <button className="btn-pink" onClick={nativeShare} style={{ marginBottom: 10 }}>
              <i className="ti ti-share" aria-hidden="true"></i> Share via...
            </button>
          )}
          <button className="btn-outline" onClick={copyCode} style={{ marginTop: 0 }}>
            {copied ? "✅ Copied!" : <><i className="ti ti-copy" aria-hidden="true"></i> Copy referral link</>}
          </button>

          {/* How it works */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>How it works</div>
            {[
              { step: "1", text: "Share your unique code with friends" },
              { step: "2", text: "Friend signs up using your code" },
              { step: "3", text: "They get 72 hours of Premium free — new accounts only, one use per email" },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--pink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.step}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TabBar active="account" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

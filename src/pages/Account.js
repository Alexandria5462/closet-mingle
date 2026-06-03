import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import TabBar from "../components/TabBar";
import Reviews from "../components/Reviews";
import Toast from "../components/Toast";

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle-profiles");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

const TIER_LABELS = {
  free: "Free",
  monthly: "Premium AI — $9.99/mo",
  premium_plus: "Premium Plus — $19.99/mo",
  session: "Pay Per Session",
  stylist_monthly: "Stylist — $20/mo",
  stylist_annual: "Stylist — $200/yr"
};

const TIER_COLORS = {
  free: "var(--bg)",
  monthly: "var(--pink-light)",
  premium_plus: "#ede9fe",
  session: "#f0fdf4"
};

// ── Cancel Subscription Confirmation Modal ────────────────────
function CancelModal({ tierLabel, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Cancel subscription?</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            You are about to cancel your <strong>{tierLabel}</strong> subscription.
            You will lose access to all premium features immediately and be moved to the Free plan.
          </div>
        </div>
        <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
          ⚠️ This action cannot be undone. You would need to resubscribe to regain access.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline btn-sm" onClick={onCancel} style={{ flex: 1, marginTop: 0 }}>
            Keep my plan
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: "var(--danger)", color: "white", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const nav = useNavigate();
  const { userProfile, currentUser, logout, updateSubscription } = useAuth();
  const fileRef = useRef();
  const isStylist = userProfile?.accountType === "stylist";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || "");
  const [about, setAbout] = useState(userProfile?.about || "");
  const [city, setCity] = useState(userProfile?.city || "");
  const [specialty, setSpecialty] = useState(userProfile?.specialty || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(userProfile?.photoUrl || null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [analytics, setAnalytics] = useState({ sessions: 0, earnings: 0, rating: 0, reviews: 0 });
  const [availability, setAvailability] = useState(userProfile?.availabilityEnabled || false);
  const [availHours, setAvailHours] = useState(userProfile?.availabilityHours || "9am - 5pm");
  const [quizResult, setQuizResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Update local state when userProfile changes in real time
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setAbout(userProfile.about || "");
      setCity(userProfile.city || "");
      setSpecialty(userProfile.specialty || "");
      setPhone(userProfile.phone || "");
      setPhotoPreview(userProfile.photoUrl || null);
      setAvailability(userProfile.availabilityEnabled || false);
      setAvailHours(userProfile.availabilityHours || "9am - 5pm");
    }
  }, [userProfile]);

  useEffect(() => {
    if (isStylist) loadAnalytics();
    loadQuizResult();
  }, []);

  async function loadAnalytics() {
    if (!currentUser?.uid) return;
    const reviewSnap = await getDocs(query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid)));
    const reviews = reviewSnap.docs.map(d => d.data());
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
    setAnalytics({
      sessions: userProfile?.totalSessions || 0,
      earnings: userProfile?.totalEarnings || 0,
      rating: avgRating,
      reviews: reviews.length,
    });
  }

  async function loadQuizResult() {
    if (!currentUser?.uid) return;
    const snap = await getDocs(query(collection(db, "styleQuiz"), where("userId", "==", currentUser.uid)));
    if (!snap.empty) setQuizResult(snap.docs[0].data());
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    if (isStylist && !about) { setToast("About me is required for stylist accounts."); return; }
    setSaving(true);
    try {
      let photoUrl = userProfile?.photoUrl || "";
      if (photoFile) photoUrl = await uploadPhoto(photoFile);
      await updateDoc(doc(db, "users", currentUser.uid), {
        name, about, city, specialty, phone, photoUrl,
        updatedAt: new Date().toISOString(),
      });
      setToast("Profile updated!");
      setEditing(false);
    } catch (e) {
      setToast("Failed to save. Try again.");
    }
    setSaving(false);
  }

  async function confirmCancelSubscription() {
    setCancelling(true);
    try {
      // Use updateSubscription so real-time listener catches it instantly
      await updateSubscription("free");
      setShowCancelModal(false);
      setToast("Subscription cancelled. You are now on the Free plan.");
    } catch (e) {
      setToast("Failed to cancel. Please try again.");
    }
    setCancelling(false);
  }

  async function toggleAvailability() {
    const newVal = !availability;
    setAvailability(newVal);
    await updateDoc(doc(db, "users", currentUser.uid), { availabilityEnabled: newVal });
  }

  async function saveAvailability() {
    await updateDoc(doc(db, "users", currentUser.uid), { availabilityHours: availHours });
    setToast("Availability saved!");
  }

  const initials = userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";
  const tierLabel = TIER_LABELS[userProfile?.subscriptionTier] || "Free";
  const tierBg = TIER_COLORS[userProfile?.subscriptionTier] || "var(--bg)";
  const hasPaidPlan = userProfile?.subscriptionTier && userProfile?.subscriptionTier !== "free";

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Closet<span>Mingle</span>
        </div>
        {editing
          ? <button className="btn-pink btn-sm" onClick={saveProfile} disabled={saving}>{saving ? <span className="spinner"></span> : "Save"}</button>
          : <button className="btn-outline btn-sm" onClick={() => setEditing(true)}>Edit profile</button>
        }
      </div>

      <div className="screen">
        <div className="body">

          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div
              onClick={() => editing && fileRef.current.click()}
              style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "var(--pink-light)", border: editing ? "2px dashed var(--pink)" : "2px solid var(--border)", cursor: editing ? "pointer" : "default", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22, fontWeight: 600, color: "var(--pink-dark)" }}>{initials}</span>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
            <div style={{ flex: 1 }}>
              {editing
                ? <input className="input-field" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 6 }} placeholder="Full name" />
                : <div style={{ fontSize: 18, fontWeight: 500 }}>{userProfile?.name}</div>
              }
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <span className="badge" style={{ background: tierBg, color: "var(--pink-dark)", fontSize: 10 }}>{tierLabel}</span>
                {isStylist && userProfile?.isVerified && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Verified Stylist</span>
                )}
              </div>
            </div>
          </div>

          {/* Stylist tabs */}
          {isStylist && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "0.5px solid var(--border)", paddingBottom: 8 }}>
              {["profile", "analytics", "availability", "portfolio"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: activeTab === tab ? "var(--pink)" : "var(--text-secondary)", borderBottom: activeTab === tab ? "2px solid var(--pink)" : "none", paddingBottom: 4, textTransform: "capitalize" }}>
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Profile tab */}
          {(!isStylist || activeTab === "profile") && (
            <>
              {/* Location */}
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>📍 Location</div>
                {editing
                  ? <input className="input-field" value={city} onChange={e => setCity(e.target.value)} placeholder="City / Location" style={{ marginBottom: 0 }} />
                  : <div style={{ fontSize: 14 }}>{userProfile?.city || "Not set"}</div>
                }
              </div>

              {/* About me */}
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                  About me {isStylist && <span style={{ color: "var(--danger)" }}>*</span>}
                </div>
                {editing
                  ? <textarea className="input-field" value={about} onChange={e => setAbout(e.target.value)} placeholder={`Tell people about yourself${isStylist ? " (required)" : " (optional)"}`} rows={3} style={{ resize: "none", fontFamily: "inherit", marginBottom: 0 }} />
                  : <div style={{ fontSize: 14, color: userProfile?.about ? "var(--text-primary)" : "var(--text-tertiary)" }}>{userProfile?.about || "No description added yet."}</div>
                }
              </div>

              {/* Phone */}
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>📱 Phone</div>
                {editing
                  ? <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{ marginBottom: 0 }} />
                  : <div style={{ fontSize: 14 }}>{userProfile?.phone || "Not set"}</div>
                }
              </div>

              {/* Stylist specialty */}
              {isStylist && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>✂️ Specialty</div>
                  {editing
                    ? <input className="input-field" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Your styling specialty" style={{ marginBottom: 0 }} />
                    : <div style={{ fontSize: 14 }}>{userProfile?.specialty || "Not set"}</div>
                  }
                </div>
              )}

              {/* Style quiz for all paid tiers */}
              {userProfile?.subscriptionTier && userProfile?.subscriptionTier !== "free" && (
                <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/quiz")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Style Profile Quiz</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {quizResult ? "Retake or view your style profile →" : "Take the quiz to match with the right stylist →"}
                      </div>
                    </div>
                    <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}

              {/* Subscription management */}
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasPaidPlan ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Subscription</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{tierLabel}</div>
                  </div>
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => nav("/plans")}
                    style={{ marginTop: 0 }}
                  >
                    {hasPaidPlan ? "Change plan" : "Upgrade"}
                  </button>
                </div>
                {/* Cancel button — only shown for paid subscribers */}
                {hasPaidPlan && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    style={{ background: "none", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "8px 14px", color: "var(--danger)", cursor: "pointer", fontSize: 13, width: "100%", fontFamily: "inherit" }}
                  >
                    Cancel subscription
                  </button>
                )}
              </div>

              {/* Reviews */}
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Reviews</div>
                <Reviews targetUserId={currentUser?.uid} targetUserName={userProfile?.name} />
              </div>

              <button
                className="btn-outline"
                onClick={async () => { await logout(); nav("/"); }}
                style={{ color: "var(--danger)", borderColor: "var(--danger)", marginTop: 8 }}
              >
                <i className="ti ti-logout" aria-hidden="true"></i> Sign out
              </button>
            </>
          )}

          {/* Analytics tab */}
          {isStylist && activeTab === "analytics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Total Sessions", value: analytics.sessions },
                  { label: "Total Earnings", value: `$${Number(analytics.earnings).toFixed(2)}` },
                  { label: "Avg Rating", value: analytics.rating || "—" },
                  { label: "Total Reviews", value: analytics.reviews },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  You keep <strong style={{ color: "var(--success)" }}>70%</strong> of every session. Closet Mingle keeps 30%.
                </div>
              </div>
            </>
          )}

          {/* Availability tab */}
          {isStylist && activeTab === "availability" && (
            <>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Available for sessions</div>
                  <button onClick={toggleAvailability} style={{ background: availability ? "var(--success)" : "#d1d5db", border: "none", borderRadius: 20, width: 44, height: 24, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 2, left: availability ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {availability ? "Visible to clients — can receive session requests." : "Hidden from clients — not receiving requests."}
                </div>
              </div>
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Availability hours</div>
                <input className="input-field" value={availHours} onChange={e => setAvailHours(e.target.value)} placeholder="e.g. Mon-Fri 9am-5pm EST" />
                <button className="btn-pink btn-sm" onClick={saveAvailability}>Save hours</button>
              </div>
            </>
          )}

          {/* Portfolio tab */}
          {isStylist && activeTab === "portfolio" && (
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Portfolio</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Your saved outfit generations will appear here as your portfolio for clients to view.
              </div>
            </div>
          )}

        </div>
      </div>

      <TabBar active="account" type={isStylist ? "stylist" : "client"} />

      {/* Cancel subscription confirmation modal */}
      {showCancelModal && (
        <CancelModal
          tierLabel={tierLabel}
          onConfirm={confirmCancelSubscription}
          onCancel={() => setShowCancelModal(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useDarkMode } from "../lib/AuthContext";
import { doc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import TabBar from "../components/TabBar";
import Reviews from "../components/Reviews";
import DarkModeToggle from "../components/DarkModeToggle";
import ImageCropper from "../components/ImageCropper";
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

function CancelModal({ tierLabel, onConfirm, onCancel, cancelling }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Cancel subscription?</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            You are about to cancel <strong>{tierLabel}</strong>. You will lose all premium features immediately and move to the Free plan.
          </div>
        </div>
        <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
          ⚠️ This cannot be undone. You would need to resubscribe to regain access.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline btn-sm" onClick={onCancel} style={{ flex: 1, marginTop: 0 }}>Keep my plan</button>
          <button onClick={onConfirm} disabled={cancelling} style={{ flex: 1, background: "var(--danger)", color: "white", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            {cancelling ? <span className="spinner"></span> : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose, changePassword }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (newPass.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPass !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      await changePassword(current, newPass);
      setDone(true);
    } catch (e) {
      setError("Current password is incorrect. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Change password</div>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Password changed successfully!</div>
            <button className="btn-pink" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <p className="error-text">{error}</p>}
            <input className="input-field" type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} />
            <input className="input-field" type="password" placeholder="New password (min 6 characters)" value={newPass} onChange={e => setNewPass(e.target.value)} />
            <input className="input-field" type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline btn-sm" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
              <button className="btn-pink btn-sm" onClick={submit} disabled={loading || !current || !newPass || !confirm} style={{ flex: 1 }}>
                {loading ? <span className="spinner"></span> : "Change password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose, deleteAccount }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (confirm !== "DELETE") { setError('Type DELETE in capitals to confirm.'); return; }
    setLoading(true); setError("");
    try {
      await deleteAccount(password);
    } catch (e) {
      setError("Password is incorrect. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "var(--danger)" }}>Delete account</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            This will permanently delete your account, closet, saved outfits and all data. This cannot be undone.
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <input className="input-field" type="password" placeholder="Enter your password to confirm" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="input-field" placeholder='Type DELETE in capitals to confirm' value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline btn-sm" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button onClick={submit} disabled={loading || !password || confirm !== "DELETE"} style={{ flex: 1, background: "var(--danger)", color: "white", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            {loading ? <span className="spinner"></span> : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const nav = useNavigate();
  const { userProfile, currentUser, logout, updateSubscription, changePassword, deleteAccount } = useAuth();
  const fileRef = useRef();
  const isStylist = userProfile?.accountType === "stylist";
  const hasPaidPlan = userProfile?.subscriptionTier && userProfile?.subscriptionTier !== "free";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || "");
  const [username, setUsername] = useState(userProfile?.username || "");
  const [about, setAbout] = useState(userProfile?.about || "");
  const [city, setCity] = useState(userProfile?.city || "");
  const [specialty, setSpecialty] = useState(userProfile?.specialty || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [availabilityEnabled, setAvailabilityEnabled] = useState(userProfile?.availabilityEnabled || false);
  const [availabilityHours, setAvailabilityHours] = useState(userProfile?.availabilityHours || "");
  const [monthlyRate, setMonthlyRate] = useState(userProfile?.monthlyRate || "");
  const [sessionRate, setSessionRate] = useState(userProfile?.sessionRate || "");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(userProfile?.photoUrl || null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [quizResult, setQuizResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ messages: true, sessions: true, tips: true, promotions: false });
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    // Read section from URL hash so back button restores position
    const hash = window.location.hash.replace("#", "");
    const validSections = ["profile", "portfolio", "reviews", "billing", "settings"];
    return validSections.includes(hash) ? hash : "profile";
  });
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const portfolioRef = useRef();
  const [verificationStatus, setVerificationStatus] = useState(null); // null | "eligible" | "pending" | "verified"
  const [verificationCriteria, setVerificationCriteria] = useState(null);
  const [requestingVerification, setRequestingVerification] = useState(false);

  const BIO_LIMIT = 300;
  const tierLabel = TIER_LABELS[userProfile?.subscriptionTier] || "Free";
  // Stylists always have a paid plan - show their actual plan not "Free"
  const stylistPlanLabel = userProfile?.stylistPlan === "annual" ? "Annual — $200/year" : "Monthly — $20/month";
  const tierBg = TIER_COLORS[userProfile?.subscriptionTier] || "var(--bg)";
  const initials = userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setUsername(userProfile.username || "");
      setAbout(userProfile.about || "");
      setCity(userProfile.city || "");
      setSpecialty(userProfile.specialty || "");
      setPhone(userProfile.phone || "");
      setAvailabilityEnabled(userProfile.availabilityEnabled || false);
      setAvailabilityHours(userProfile.availabilityHours || "");
      setMonthlyRate(userProfile.monthlyRate || "");
      setSessionRate(userProfile.sessionRate || "");
      setPhotoPreview(userProfile.photoUrl || null);
      if (userProfile.notifPrefs) setNotifPrefs(userProfile.notifPrefs);
    }
    loadQuizResult();
    if (isStylist) {
      loadPortfolio();
      checkVerification();
    }
  }, [userProfile]);

  async function checkVerification() {
    if (!currentUser?.uid || !userProfile) return;
    try {
      if (userProfile.isVerified) { setVerificationStatus("verified"); return; }

      const reqSnap = await getDocs(
        query(collection(db, "verificationRequests"),
          where("stylistId", "==", currentUser.uid),
          where("status", "==", "pending")
        )
      );
      if (!reqSnap.empty) { setVerificationStatus("pending"); return; }

      const profileComplete = !!(userProfile.name && userProfile.username && userProfile.photoUrl && userProfile.about && userProfile.specialty && userProfile.city && userProfile.availabilityHours);
      const createdAt = userProfile.createdAt ? new Date(userProfile.createdAt) : new Date(currentUser.metadata?.creationTime);
      const ageDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
      const accountAgeOk = ageDays >= 90;

      const savedPortSnap = await getDocs(query(collection(db, "savedOutfits"), where("userId", "==", currentUser.uid), where("isPortfolio", "==", true)));
      const portfolioCount = savedPortSnap.size;
      const portfolioOk = portfolioCount >= 10;

      const reviewSnap = await getDocs(query(collection(db, "reviews"), where("targetUserId", "==", currentUser.uid)));
      const reviews = reviewSnap.docs.map(d => d.data());
      const uniqueReviewers = new Set(reviews.map(r => r.reviewerId)).size;
      const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
      const reviewsOk = uniqueReviewers >= 10;
      const ratingOk = avgRating >= 4.0;

      const sessionSnap = await getDocs(query(collection(db, "chatSessions"), where("stylistId", "==", currentUser.uid)));
      const uniqueClients = new Set(sessionSnap.docs.map(d => d.data().clientId)).size;
      const clientsOk = uniqueClients >= 5;

      const criteria = {
        profileComplete: { met: profileComplete, label: "Complete profile",         detail: "Name, photo, about, specialty, city & availability hours" },
        accountAge:      { met: accountAgeOk,    label: "Account age 90+ days",     detail: `${ageDays} day${ageDays !== 1 ? "s" : ""} old` },
        portfolio:       { met: portfolioOk,      label: "10+ portfolio images",     detail: `${portfolioCount} image${portfolioCount !== 1 ? "s" : ""} uploaded` },
        reviews:         { met: reviewsOk,        label: "10+ reviews",              detail: `${uniqueReviewers} unique reviewer${uniqueReviewers !== 1 ? "s" : ""}` },
        rating:          { met: ratingOk,         label: "4.0+ average rating",      detail: avgRating > 0 ? `${avgRating.toFixed(1)} avg` : "No reviews yet" },
        clients:         { met: clientsOk,        label: "5+ active clients",        detail: `${uniqueClients} client${uniqueClients !== 1 ? "s" : ""}` },
      };
      setVerificationCriteria(criteria);
      setVerificationStatus(Object.values(criteria).every(c => c.met) ? "eligible" : "not_eligible");
    } catch(e) { console.error("Verification check:", e); }
  }

  async function requestVerification() {
    setRequestingVerification(true);
    try {
      await addDoc(collection(db, "verificationRequests"), {
        stylistId: currentUser.uid,
        stylistName: userProfile.name,
        stylistUsername: userProfile.username,
        status: "pending",
        requestedAt: new Date().toISOString(),
      });
      setVerificationStatus("pending");
      setToast("Verification request submitted! We will review your profile shortly.");
    } catch(e) { setToast("Failed to submit. Please try again."); }
    setRequestingVerification(false);
  }

  async function connectStripe() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/create-connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stylistId: currentUser.uid,
          email: currentUser.email,
          name: userProfile?.name || "",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast(data.error || "Failed to connect Stripe. Try again.");
      }
    } catch(e) {
      setToast("Failed to connect Stripe. Try again.");
    }
    setStripeLoading(false);
  }

  async function loadQuizResult() {
    if (!currentUser?.uid) return;
    const snap = await getDocs(query(collection(db, "styleQuiz"), where("userId", "==", currentUser.uid)));
    if (!snap.empty) setQuizResult(snap.docs[0].data());
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    // Show cropper first before setting the photo
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleCropDone(croppedDataUrl) {
    setCropSrc(null);
    // Convert cropped data URL to file
    fetch(croppedDataUrl)
      .then(r => r.blob())
      .then(blob => {
        const croppedFile = new File([blob], "profile.jpg", { type: "image/jpeg" });
        setPhotoFile(croppedFile);
        setPhotoPreview(croppedDataUrl);
      });
  }

  async function loadPortfolio() {
    if (!currentUser?.uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, "savedOutfits"),
          where("userId", "==", currentUser.uid),
          where("isPortfolio", "==", true)
        )
      );
      setPortfolio(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }

  async function uploadPortfolioPhoto(file) {
    setPortfolioLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "closet-mingle-portfolio");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      const photoUrl = data.secure_url;
      await addDoc(collection(db, "savedOutfits"), {
        userId: currentUser.uid,
        isPortfolio: true,
        itemImages: [photoUrl],
        outfitName: "Portfolio piece",
        savedAt: new Date().toISOString(),
        expiresAt: null,
      });
      setToast("Portfolio photo added!");
      await loadPortfolio();
    } catch (e) {
      setToast("Failed to upload. Try again.");
    }
    setPortfolioLoading(false);
  }

  async function saveProfile() {
    if (isStylist && !about) { setToast("About me is required for stylist accounts."); return; }
    setSaving(true);
    try {
      let photoUrl = userProfile?.photoUrl || "";
      if (photoFile) photoUrl = await uploadPhoto(photoFile);
      if (!username || username.length < 3) { setToast("Username must be at least 3 characters."); setSaving(false); return; }
      await updateDoc(doc(db, "users", currentUser.uid), {
        name, username: username.toLowerCase(), about, city, specialty, phone,
        availabilityEnabled, availabilityHours,
        monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
        sessionRate: sessionRate ? parseFloat(sessionRate) : null,
        photoUrl, updatedAt: new Date().toISOString()
      });
      setToast("Profile updated!");
      setEditing(false);
    } catch (e) { setToast("Failed to save. Try again."); }
    setSaving(false);
  }

  async function confirmCancel() {
    setCancelling(true);
    try {
      await updateSubscription("free");
      setShowCancelModal(false);
      setToast("Subscription cancelled. You are now on the Free plan.");
    } catch (e) { setToast("Failed to cancel. Please try again."); }
    setCancelling(false);
  }

  async function saveNotifPrefs(prefs) {
    setNotifPrefs(prefs);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { notifPrefs: prefs });
    } catch (e) { console.error(e); }
  }

  const sections = isStylist
    ? ["profile", "portfolio", "reviews", "billing", "settings"]
    : ["profile", "reviews", "billing", "settings"];

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav(isStylist ? "/stylist" : "/home")}><em>closet</em><span>mingle</span></div>
        {editing
          ? <button className="btn-pink btn-sm" onClick={saveProfile} disabled={saving}>{saving ? <span className="spinner"></span> : "Save"}</button>
          : <button className="btn-outline btn-sm" onClick={() => setEditing(true)}>Edit profile</button>
        }
      </div>

      <div className="screen">
        <div className="body">

          {/* Username missing banner — prompts existing users to add one */}
          {!userProfile?.username && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>⚠️ Please add a username to your profile</span>
              <button onClick={() => setEditing(true)} style={{ background: "#d97706", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                Add now
              </button>
            </div>
          )}

          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={() => editing && fileRef.current.click()} style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "var(--avatar-bg)", border: editing ? "2px dashed var(--pink)" : "2px solid var(--border)", cursor: editing ? "pointer" : "default", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {photoPreview
                ? <img src={photoPreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22, fontWeight: 600, color: "var(--pink-dark)" }}>{initials}</span>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
            <div style={{ flex: 1 }}>
              {editing
                ? (
                  <>
                    <input className="input-field" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 6 }} placeholder="Full name" />
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 13 }}>@</span>
                      <input className="input-field" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,"").toLowerCase())} style={{ paddingLeft: 24, marginBottom: 6 }} placeholder="username (required)" />
                    </div>
                  </>
                )
                : <div style={{ fontSize: 18, fontWeight: 500 }}>{userProfile?.name}</div>
              }
              {userProfile?.username && (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>@{userProfile.username}</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <span className="badge" style={{
                  background: isStylist ? "var(--pink-light)" : tierBg,
                  color: "var(--pink-dark)", fontSize: 10, fontWeight: 600
                }}>
                  {isStylist ? "Stylist" : tierLabel}
                </span>
                {isStylist && userProfile?.isVerified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Verified</span>}
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid var(--border)", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", flexWrap: "nowrap" }}>
            {sections.map(s => (
              <button key={s} onClick={() => { setActiveSection(s); try { window.history.replaceState(null, "", "#" + s); } catch(e) {} }} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: activeSection === s ? 600 : 400,
                color: activeSection === s ? "var(--pink)" : "var(--text-secondary)",
                borderBottom: activeSection === s ? "2px solid var(--pink)" : "2px solid transparent",
                paddingBottom: 10, paddingTop: 4, paddingLeft: 12, paddingRight: 12,
                textTransform: "capitalize", whiteSpace: "nowrap",
                marginBottom: -2, transition: "all 0.15s",
              }}>
                {s}
              </button>
            ))}
          </div>

          {/* ── Profile section ── */}
          {activeSection === "profile" && (
            <>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Location</div>
                {editing
                  ? <input className="input-field" value={city} onChange={e => setCity(e.target.value)} placeholder="City / Location" style={{ marginBottom: 0 }} />
                  : <div style={{ fontSize: 14 }}>{userProfile?.city || "Not set"}</div>
                }
              </div>

              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>About me {isStylist && <span style={{ color: "var(--danger)" }}>*</span>}</div>
                {editing ? (
                  <div>
                    <textarea className="input-field" value={about} onChange={e => e.target.value.length <= BIO_LIMIT && setAbout(e.target.value)} placeholder={`Tell people about yourself${isStylist ? " (required)" : " (optional)"}`} rows={3} style={{ resize: "none", fontFamily: "inherit", marginBottom: 2 }} />
                    <div style={{ fontSize: 10, color: about.length > BIO_LIMIT * 0.9 ? "var(--danger)" : "var(--text-tertiary)", textAlign: "right" }}>{about.length}/{BIO_LIMIT}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: userProfile?.about ? "var(--text-primary)" : "var(--text-tertiary)" }}>{userProfile?.about || "No description added yet."}</div>
                )}
              </div>

              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Phone</div>
                {editing
                  ? <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{ marginBottom: 0 }} />
                  : <div style={{ fontSize: 14 }}>{userProfile?.phone || "Not set"}</div>
                }
              </div>

              {isStylist && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Specialty</div>
                  {editing
                    ? <input className="input-field" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Your styling specialty" style={{ marginBottom: 0 }} />
                    : <div style={{ fontSize: 14 }}>{userProfile?.specialty || "Not set"}</div>
                  }
                </div>
              )}

              {/* Availability — stylist only */}
              {isStylist && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Availability</div>
                  {/* Online toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: availabilityEnabled ? 12 : 0 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Show as available now</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Clients will see a green "Online now" badge on your profile</div>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !availabilityEnabled;
                        setAvailabilityEnabled(next);
                        try {
                          await updateDoc(doc(db, "users", currentUser.uid), { availabilityEnabled: next });
                          setToast(next ? "You are now shown as available" : "You are now shown as offline");
                        } catch(e) { setAvailabilityEnabled(!next); }
                      }}
                      style={{ background: availabilityEnabled ? "var(--pink)" : "#d1d5db", border: "none", borderRadius: 20, width: 44, height: 24, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: 3, left: availabilityEnabled ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {/* Hours — only show when toggling is on or hours are set */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Available hours <span style={{ fontSize: 11 }}>(optional — e.g. "Mon–Fri 9am–6pm")</span></div>
                    {editing ? (
                      <input
                        className="input-field"
                        value={availabilityHours}
                        onChange={e => setAvailabilityHours(e.target.value)}
                        placeholder="e.g. Mon–Fri 9am–6pm EST"
                        style={{ marginBottom: 0 }}
                      />
                    ) : (
                      <div style={{ fontSize: 13, color: availabilityHours ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                        {availabilityHours || "Not set — tap Edit to add hours"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio — stylist only */}
              {isStylist && (
                <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/stylist/portfolio")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>My Portfolio</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        Upload outfit photos for clients to see →
                      </div>
                    </div>
                    <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}

              {/* Pricing — stylist only */}
              {isStylist && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Your rates</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                    Set what clients pay to work with you. You keep <strong>80%</strong> of every booking — ClosetMingle keeps 20%.
                  </div>

                  {/* Monthly rate */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                      Monthly rate <span style={{ fontSize: 11 }}>(unlimited messaging for 1 month)</span>
                    </div>
                    {editing ? (
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: 14 }}>$</span>
                        <input
                          className="input-field"
                          type="number"
                          min="5"
                          max="500"
                          placeholder="e.g. 49"
                          value={monthlyRate}
                          onChange={e => setMonthlyRate(e.target.value)}
                          style={{ paddingLeft: 28, marginBottom: 0 }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500, color: monthlyRate ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                        {monthlyRate ? `$${monthlyRate}/month` : "Not set — tap Edit to add"}
                      </div>
                    )}
                  </div>

                  {/* Session rate */}
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                      Per-session rate <span style={{ fontSize: 11 }}>(single 24-hour session)</span>
                    </div>
                    {editing ? (
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: 14 }}>$</span>
                        <input
                          className="input-field"
                          type="number"
                          min="5"
                          max="500"
                          placeholder="e.g. 25"
                          value={sessionRate}
                          onChange={e => setSessionRate(e.target.value)}
                          style={{ paddingLeft: 28, marginBottom: 0 }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500, color: sessionRate ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                        {sessionRate ? `$${sessionRate}/session` : "Not set — tap Edit to add"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stripe Connect — stylist only */}
              {isStylist && (
                <div className="card" style={{ border: `1px solid ${userProfile?.stripeOnboardingComplete ? "#6ee7b7" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 28 }}>{userProfile?.stripeOnboardingComplete ? "✅" : "💳"}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {userProfile?.stripeOnboardingComplete ? "Payments connected" : "Connect Stripe to get paid"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {userProfile?.stripeOnboardingComplete
                          ? "You can receive bookings and payouts"
                          : "Required before clients can book you"
                        }
                      </div>
                    </div>
                  </div>
                  {!userProfile?.stripeOnboardingComplete && (
                    <>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                        Set up your payout account so you're ready to receive payments when ClosetMingle launches fully. Takes about 5 minutes — you'll need your bank account details.
                      </div>
                      <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "#92400e" }}>
                        🚧 <strong>Pre-launch:</strong> Stripe is in sandbox mode. Set up your rates and profile now — payments will activate when the platform goes live.
                      </div>
                      <button
                        className="btn-pink"
                        onClick={connectStripe}
                        disabled={stripeLoading}
                        style={{ marginBottom: 0 }}
                      >
                        {stripeLoading ? "Opening Stripe..." : "Set up payouts with Stripe →"}
                      </button>
                    </>
                  )}
                  {userProfile?.stripeOnboardingComplete && (
                    <div style={{ fontSize: 12, color: "#065f46" }}>
                      Payouts are sent automatically after each booking. You keep 80% of every booking.
                    </div>
                  )}
                </div>
              )}
              {isStylist && (
                <div className="card" style={{ border: verificationStatus === "verified" ? "1px solid #6ee7b7" : verificationStatus === "eligible" ? "1px solid var(--pink)" : "0.5px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 26 }}>
                      {verificationStatus === "verified" ? "✅" : verificationStatus === "pending" ? "⏳" : verificationStatus === "eligible" ? "🏆" : "🎯"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {verificationStatus === "verified" ? "You are Verified ✓" :
                         verificationStatus === "pending" ? "Verification Pending" :
                         verificationStatus === "eligible" ? "You qualify for Verification!" :
                         "Get Verified"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {verificationStatus === "verified" ? "Your verified badge is live on your profile" :
                         verificationStatus === "pending" ? "We are reviewing your request — check back soon" :
                         verificationStatus === "eligible" ? "All criteria met — request your badge now" :
                         "Complete the criteria below to earn your verified badge"}
                      </div>
                    </div>
                  </div>

                  {/* Criteria checklist */}
                  {verificationStatus !== "verified" && verificationStatus !== "pending" && verificationCriteria && (
                    <div style={{ marginBottom: 14 }}>
                      {Object.values(verificationCriteria).map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < Object.values(verificationCriteria).length - 1 ? "0.5px solid var(--border)" : "none" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.met ? "#d1fae5" : "var(--bg)", border: `1px solid ${c.met ? "#6ee7b7" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {c.met
                              ? <i className="ti ti-check" style={{ fontSize: 11, color: "#065f46" }} aria-hidden="true"></i>
                              : <i className="ti ti-x" style={{ fontSize: 11, color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: c.met ? "var(--text-primary)" : "var(--text-secondary)" }}>{c.label}</div>
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA button */}
                  {verificationStatus === "eligible" && (
                    <button
                      className="btn-pink"
                      onClick={requestVerification}
                      disabled={requestingVerification}
                      style={{ width: "100%", marginBottom: 0 }}
                    >
                      {requestingVerification ? "Submitting..." : "Request Verification →"}
                    </button>
                  )}
                  {verificationStatus === "not_eligible" && verificationCriteria && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
                      {Object.values(verificationCriteria).filter(c => !c.met).length} requirement{Object.values(verificationCriteria).filter(c => !c.met).length !== 1 ? "s" : ""} remaining
                    </div>
                  )}
                </div>
              )}

              {/* Style quiz */}
              {userProfile?.subscriptionTier && userProfile?.subscriptionTier !== "free" && (
                <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/quiz")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Style Profile Quiz</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {quizResult ? "View or retake your style profile →" : "Take the quiz to match with the right stylist →"}
                      </div>
                    </div>
                    <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Settings section ── */}
          {activeSection === "settings" && (
            <>
              {/* Notifications */}
              <div className="card" style={{ cursor: "pointer", marginBottom: 10 }} onClick={() => nav("/notifications")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Notifications</div>
                  <i className="ti ti-bell" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>
              {isStylist && (
                <div className="card" style={{ cursor: "pointer", marginBottom: 10 }} onClick={() => nav("/blocked-users")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Blocked Clients</div>
                    <i className="ti ti-shield-off" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}
              {/* Dark mode */}
              <div style={{ marginBottom: 10 }}>
                <DarkModeToggle />
              </div>

              {/* Notification preferences */}
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Notification preferences</div>
                {[
                  { key: "messages", label: "New messages", sub: "When a stylist or client messages you" },
                  { key: "sessions", label: "Session updates", sub: "Session started, ended, or completed" },
                  // Tips received — stylist accounts only
                  ...(isStylist ? [{ key: "tips", label: "Tips received", sub: "When a client leaves you a tip" }] : []),
                  { key: "promotions", label: "Promotions & updates", sub: "New features and offers from ClosetMingle" },
                ].map(n => (
                  <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{n.sub}</div>
                    </div>
                    <button
                      onClick={() => { const p = { ...notifPrefs, [n.key]: !notifPrefs[n.key] }; saveNotifPrefs(p); }}
                      style={{ background: notifPrefs[n.key] ? "var(--pink)" : "#d1d5db", border: "none", borderRadius: 20, width: 40, height: 22, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: 2, left: notifPrefs[n.key] ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Change password */}
              <div className="card" style={{ cursor: "pointer" }} onClick={() => setShowPasswordModal(true)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Change password</div>
                  <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>

              {/* Closet privacy — client only */}
              {!isStylist && (
                <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/closet-privacy")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Closet Privacy</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Control which items stylists can see</div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}

              {/* Following — client only */}
              {!isStylist && (
                <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/following")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Following</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Stylists you follow</div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                  </div>
                </div>
              )}

              {/* Referral */}
              <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/referral")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Invite friends</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Get 72 hours free for each friend you refer</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>

              {/* Gift subscription */}
              <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/gift")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Gift a subscription</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Send Premium as a gift to someone</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>

              {/* Sign out */}
              <button className="btn-outline" onClick={async () => { await logout(); nav("/"); }} style={{ color: "var(--danger)", borderColor: "var(--danger)", marginTop: 8 }}>
                <i className="ti ti-logout" aria-hidden="true"></i> Sign out
              </button>

              {/* Delete account */}
              <button onClick={() => setShowDeleteModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 12, width: "100%", textAlign: "center", marginTop: 8, textDecoration: "underline" }}>
                Delete my account
              </button>
            </>
          )}

          {/* ── Billing section ── */}
          {activeSection === "billing" && (
            <>
              {isStylist ? (
                <>
                  {/* Stylist billing — show their plan options clearly */}
                  <div className="card" style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1" }}>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Your current stylist plan</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--pink-dark)", marginBottom: 4 }}>{stylistPlanLabel}</div>
                    <div style={{ fontSize: 12, color: "var(--pink-dark)", opacity: 0.8 }}>
                      {userProfile?.subscriptionTier === "stylist_annual" ? "Billed $200/year · Saving $40 vs monthly" : "Billed $20/month"}
                    </div>
                  </div>

                  {/* Plan comparison for stylists */}
                  <div className="section-label" style={{ marginTop: 8 }}>Stylist plan options</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div style={{ background: userProfile?.subscriptionTier === "stylist_monthly" ? "var(--pink-light)" : "var(--bg-card)", border: `2px solid ${userProfile?.subscriptionTier === "stylist_monthly" ? "var(--pink)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Monthly</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--pink-dark)" }}>$20</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>per month</div>
                      {userProfile?.subscriptionTier === "stylist_monthly" && (
                        <div style={{ marginTop: 8, fontSize: 10, background: "var(--pink)", color: "white", borderRadius: 10, padding: "2px 8px" }}>Current plan</div>
                      )}
                    </div>
                    <div style={{ background: userProfile?.subscriptionTier === "stylist_annual" ? "#d1fae5" : "var(--bg-card)", border: `2px solid ${userProfile?.subscriptionTier === "stylist_annual" ? "#059669" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Annual</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>$200</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>per year</div>
                      <div style={{ fontSize: 10, background: "#d1fae5", color: "#065f46", borderRadius: 10, padding: "2px 8px", marginTop: 4, fontWeight: 500 }}>Save $40/yr</div>
                      {userProfile?.subscriptionTier === "stylist_annual" && (
                        <div style={{ marginTop: 4, fontSize: 10, background: "#059669", color: "white", borderRadius: 10, padding: "2px 8px" }}>Current plan</div>
                      )}
                    </div>
                  </div>

                  <div className="card" style={{ background: "#f0fdf4", border: "1px solid #6ee7b7" }}>
                    <div style={{ fontSize: 13, color: "#065f46" }}>
                      💝 You keep <strong>100%</strong> of every tip · 🎯 You keep <strong>70%</strong> of every "Try a Session" fee
                    </div>
                  </div>

                  {hasPaidPlan && (
                    <button onClick={() => setShowCancelModal(true)} style={{ background: "none", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--danger)", cursor: "pointer", fontSize: 13, width: "100%", fontFamily: "inherit", marginTop: 4 }}>
                      Cancel stylist subscription
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Client billing */}
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasPaidPlan ? 12 : 0 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Current plan</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{tierLabel}</div>
                      </div>
                      <button className="btn-outline btn-sm" onClick={() => nav("/plans")} style={{ marginTop: 0 }}>
                        {hasPaidPlan ? "Change plan" : "Upgrade"}
                      </button>
                    </div>
                    {hasPaidPlan && (
                      <button onClick={() => setShowCancelModal(true)} style={{ background: "none", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "8px 14px", color: "var(--danger)", cursor: "pointer", fontSize: 13, width: "100%", fontFamily: "inherit" }}>
                        Cancel subscription
                      </button>
                    )}
                  </div>
                </>
              )}

              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Payment history</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Payment history will be available once Stripe is fully activated. Visit your{" "}
                  <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
                    Stripe dashboard
                  </span>{" "}
                  to view all transactions.
                </div>
              </div>
            </>
          )}

          {/* ── My Messages & Following — client only, under Profile ── */}
          {activeSection === "profile" && !isStylist && (
            <div style={{ marginTop: 16 }}>
              {/* My Messages link */}
              <div className="card" style={{ cursor: "pointer", marginBottom: 10 }} onClick={() => nav("/my-messages")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>My Messages</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>View conversations with your stylists</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>
              {/* Following link */}
              <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/following")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Following</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Stylists you follow</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                </div>
              </div>
            </div>
          )}

          {/* ── Portfolio section — stylists only ── */}
          {activeSection === "portfolio" && isStylist && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Upload photos of outfits you have built. Only visible to clients.</div>
                <button
                  onClick={() => portfolioRef.current.click()}
                  className="btn-pink btn-sm"
                  disabled={portfolioLoading}
                  style={{ flexShrink: 0 }}
                >
                  {portfolioLoading ? <span className="spinner"></span> : <><i className="ti ti-plus" aria-hidden="true"></i> Add</>}
                </button>
              </div>
              <input ref={portfolioRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && uploadPortfolioPhoto(e.target.files[0])} />
              {portfolio.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>No portfolio photos yet</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Tap + Add to upload your first outfit photo</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {portfolio.map((item, i) => (
                    <div key={item.id || i} style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)", aspectRatio: "1", background: "var(--bg)" }}>
                      {(item.itemImages || [])[0] && (
                        <img src={item.itemImages[0]} alt="Portfolio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Reviews section ── */}
          {activeSection === "reviews" && (
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>My reviews</div>
              <Reviews targetUserId={currentUser?.uid} targetUserName={userProfile?.name} />
            </div>
          )}

        </div>
      </div>

      <TabBar active="account" type={isStylist ? "stylist" : "client"} />

      {showCancelModal && <CancelModal tierLabel={tierLabel} onConfirm={confirmCancel} onCancel={() => setShowCancelModal(false)} cancelling={cancelling} />}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} changePassword={changePassword} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} deleteAccount={deleteAccount} />}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}

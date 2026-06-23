import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const SPECIALTIES = [
  "Casual & Everyday",
  "Business Casual",
  "Corporate & Executive",
  "Streetwear & Urban",
  "Athleisure & Sporty",
  "Formal & Evening",
  "Bridal & Special Occasions",
  "Resort & Vacation",
  "Bohemian & Free Spirit",
  "Minimalist & Clean",
  "Y2K & Retro",
  "Cottagecore & Romantic",
  "Dark & Edgy",
  "Plus Size Specialist",
  "Petite Specialist",
  "Men's Fashion",
  "Teen & Young Adult",
  "Modest Fashion",
  "Sustainable & Eco Fashion",
  "Color Analysis Specialist",
];

async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle-profiles");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

export default function Signup() {
  const nav = useNavigate();
  const { signup } = useAuth();
  const fileRef = useRef();
  const [acct, setAcct] = useState("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [username, setUsername] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [yearsExp, setYearsExp] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [stylistPlan, setStylistPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const BIO_LIMIT = 300;

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!name || !email || !password) { setError("Please fill in all required fields."); return; }
    if (!ageConfirmed) { setError("You must confirm you are 18 or older to create an account."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (acct === "stylist" && !photoFile && !photoPreview) { setError("A profile photo is required for stylist accounts."); return; }
    if (acct === "stylist" && !about) { setError("About me is required for stylist accounts."); return; }
    if (acct === "stylist" && specialties.length === 0) { setError("Please select at least one styling specialty."); return; }
    if (acct === "stylist" && !city) { setError("Location is required for stylist accounts."); return; }

    setLoading(true);
    setError("");
    try {
      let photoUrl = null;
      if (photoFile) photoUrl = await uploadProfilePhoto(photoFile);

      const extra = {
        username: username.toLowerCase(),
        phone: phone || "",
        city: city || "",
        about: about || "",
        photoUrl: photoUrl || "",
        ...(acct === "stylist" && {
          specialty: specialties.join(", "),  // store as comma string for display
          specialties,                         // also store as array for filtering
          yearsExperience: parseInt(yearsExp) || 0,
          stylistPlan,
          isVerified: false,
          rating: 0,
          totalSessions: 0,
          totalEarnings: 0,
          availabilityEnabled: false,
        }),
      };

      await signup(email, password, name, acct, extra);

      // Small delay to let Firebase auth state settle before navigating
      await new Promise(resolve => setTimeout(resolve, 300));

      // Apply referral promo — 72hr free trial for new user only
      if (referrerId && acct === "client") {
        try {
          const { collection, query, where, getDocs, updateDoc, doc, addDoc } = await import("firebase/firestore");
          const { db: fdb } = await import("../lib/firebase");
          const { getAuth } = await import("firebase/auth");
          const uid = getAuth().currentUser?.uid;
          if (uid) {
            // Mark referral as used
            const refSnap = await getDocs(
              query(collection(fdb, "referrals"), where("code", "==", promoCode.trim().toUpperCase()))
            );
            if (!refSnap.empty) {
              await updateDoc(doc(fdb, "referrals", refSnap.docs[0].id), {
                usedBy: uid,
                usedAt: new Date().toISOString(),
              });
            }
            // Give new user 72hr premium trial
            const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
            await updateDoc(doc(fdb, "users", uid), {
              subscriptionTier: "monthly",
              promoTrialExpiry: expiresAt,
            });
          }
        } catch(e) { console.error("Promo apply error:", e); }
      }

      if (acct === "stylist") {
        nav("/stylist", { replace: true });
      } else {
        nav("/onboarding", { replace: true });
      }
    } catch (e) {
      setError(e.message.includes("email-already-in-use") ? "Email already in use." : "Sign up failed. Try again.");
    }
    setLoading(false);
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}><em>closet</em><span>mingle</span></div>
        <button onClick={() => nav("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Back</button>
      </div>
      <div className="body">
        <div className="section-label">Create account</div>

        {/* Account type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {["client", "stylist"].map(t => (
            <div key={t} className={`plan-card${acct === t ? " selected" : ""}`} onClick={() => setAcct(t)} style={{ textAlign: "center", padding: 14 }}>
              <i className={`ti ${t === "client" ? "ti-user" : "ti-scissors"}`} style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, textTransform: "capitalize" }}>{t}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                {t === "client" ? "Build outfits & chat with stylists" : "$20/mo or $200/yr"}
              </div>
            </div>
          ))}
        </div>

        {/* Profile photo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{ width: 80, height: 80, borderRadius: "50%", background: photoPreview ? "transparent" : "var(--pink-light)", border: `2px ${acct === "stylist" ? "solid var(--pink)" : "dashed var(--pink)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginBottom: 6 }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <i className="ti ti-camera" style={{ fontSize: 24, color: "var(--pink)" }} aria-hidden="true"></i>
            }
          </div>
          <span style={{ fontSize: 12, color: acct === "stylist" ? "var(--danger)" : "var(--text-secondary)" }}>
            {acct === "stylist" ? "Profile photo required *" : "Add profile photo (optional)"}
          </span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
        </div>

        {error && <p className="error-text">{error}</p>}

        <input className="input-field" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} />
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 14 }}>@</span>
          <input className="input-field" placeholder="Username * (e.g. alexstyles)" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())} style={{ paddingLeft: 28 }} />
        </div>
        <input className="input-field" type="email" placeholder="Email address *" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input-field" type="password" placeholder="Password (min 6 characters) *" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="input-field" type="tel" placeholder="Phone number (for verification)" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="input-field" placeholder={`City / Location ${acct === "stylist" ? "*" : "(optional)"}`} value={city} onChange={e => setCity(e.target.value)} />

        <div style={{ position: "relative", marginBottom: 12 }}>
          <textarea
            className="input-field"
            placeholder={`About me ${acct === "stylist" ? "* (required)" : "(optional)"}`}
            value={about}
            onChange={e => e.target.value.length <= BIO_LIMIT && setAbout(e.target.value)}
            rows={3}
            style={{ resize: "none", fontFamily: "inherit", marginBottom: 0 }}
          />
          <div style={{ fontSize: 10, color: about.length > BIO_LIMIT * 0.9 ? "var(--danger)" : "var(--text-tertiary)", textAlign: "right", marginTop: 2 }}>
            {about.length}/{BIO_LIMIT}
          </div>
        </div>

        {acct === "stylist" && (
          <>
            {/* Specialty multi-select */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                Styling specialties * <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>— select all that apply</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SPECIALTIES.map(s => {
                  const selected = specialties.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpecialties(prev =>
                        selected ? prev.filter(x => x !== s) : [...prev, s]
                      )}
                      style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 12, fontFamily: "inherit",
                        cursor: "pointer", border: `1.5px solid ${selected ? "var(--pink)" : "var(--border)"}`,
                        background: selected ? "var(--pink)" : "var(--bg-card)",
                        color: selected ? "white" : "var(--text-secondary)",
                        fontWeight: selected ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {specialties.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--pink-dark)", marginTop: 6 }}>
                  {specialties.length} selected
                </div>
              )}
            </div>

            <input
              className="input-field"
              type="number"
              placeholder="Years of experience *"
              value={yearsExp}
              onChange={e => setYearsExp(e.target.value)}
              min="0"
              max="50"
            />

            {/* Stylist subscription */}
            <div className="section-label" style={{ marginTop: 8 }}>Stylist subscription *</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { id: "monthly", label: "$20/month", sub: "Billed monthly" },
                { id: "annual", label: "$200/year", sub: "Save $40/year" },
              ].map(p => (
                <div key={p.id} className={`plan-card${stylistPlan === p.id ? " selected" : ""}`} onClick={() => setStylistPlan(p.id)} style={{ textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{p.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46" }}>
              💝 Keep <strong>100%</strong> of every tip · 💰 Keep <strong>80%</strong> of every booking — you set your own rates. Cancel anytime.
            </div>
          </>
        )}

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginBottom: 12, lineHeight: 1.6 }}>
          By creating an account you agree to our{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => window.location.href = "/terms"}>Terms of Service</span>
          {" "}and{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => window.location.href = "/privacy"}>Privacy Policy</span>
        </p>
        {/* Promo code — optional, client paid plans only */}
        {acct === "client" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
              Promo / referral code <span style={{ color: "var(--text-tertiary)" }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input-field"
                placeholder="Enter code"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                style={{ marginBottom: 0, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}
                maxLength={12}
              />
            </div>
            {promoError && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{promoError}</div>
            )}
            {promoApplied && (
              <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>
                Code applied! You'll get a 72-hour free trial.
              </div>
            )}
          </div>
        )}

        {/* Age confirmation — required, no account creation without it */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14, padding: "10px 12px", background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
          <input
            type="checkbox"
            id="ageConfirm"
            checked={ageConfirmed}
            onChange={e => setAgeConfirmed(e.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: "pointer" }}
          />
          <label htmlFor="ageConfirm" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, cursor: "pointer" }}>
            I confirm that I am 18 years of age or older and agree to ClosetMingle's{" "}
            <span style={{ color: "var(--pink-dark)", textDecoration: "underline" }} onClick={e => { e.preventDefault(); nav("/terms"); }}>Terms of Service</span>.
          </label>
        </div>

        <button className="btn-pink" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="spinner"></span> : "Create account"}
        </button>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/login")}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

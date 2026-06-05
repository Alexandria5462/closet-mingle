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
  const [specialty, setSpecialty] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [stylistPlan, setStylistPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const BIO_LIMIT = 300;

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!name || !email || !password) { setError("Please fill in all required fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (acct === "stylist" && !photoFile && !photoPreview) { setError("A profile photo is required for stylist accounts."); return; }
    if (acct === "stylist" && !about) { setError("About me is required for stylist accounts."); return; }
    if (acct === "stylist" && !specialty) { setError("Please select your styling specialty."); return; }
    if (acct === "stylist" && !city) { setError("Location is required for stylist accounts."); return; }

    setLoading(true);
    setError("");
    try {
      let photoUrl = null;
      if (photoFile) photoUrl = await uploadProfilePhoto(photoFile);

      const extra = {
        phone: phone || "",
        city: city || "",
        about: about || "",
        photoUrl: photoUrl || "",
        ...(acct === "stylist" && {
          specialty,
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

      if (acct === "stylist") nav("/stylist");
      else nav("/onboarding");
    } catch (e) {
      setError(e.message.includes("email-already-in-use") ? "Email already in use." : "Sign up failed. Try again.");
    }
    setLoading(false);
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}>Closet<span>Mingle</span></div>
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
            {/* Specialty dropdown */}
            <div style={{ marginBottom: 12 }}>
              <select
                className="input-field"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                style={{ marginBottom: 0, cursor: "pointer" }}
              >
                <option value="">Select your styling specialty *</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
              💰 You keep <strong>70%</strong> of every session. Closet Mingle keeps 30%. Cancel anytime.
            </div>
          </>
        )}

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

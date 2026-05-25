import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Signup() {
  const nav = useNavigate();
  const { signup } = useAuth();
  const [acct, setAcct] = useState("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      await signup(email, password, name, acct, acct==="stylist" ? {specialty} : {});
      if (acct === "stylist") nav("/stylist");
      else nav("/plans");
    } catch(e) {
      setError(e.message.includes("email-already-in-use") ? "Email already in use." : "Sign up failed. Try again.");
    }
    setLoading(false);
  }

  return (
    <div className="screen" style={{paddingBottom:0}}>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <button onClick={()=>nav("/")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-secondary)",fontSize:13}}>Back</button>
      </div>
      <div className="body">
        <div className="section-label">Create account</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {["client","stylist"].map(t=>(
            <div key={t} className={`plan-card${acct===t?" selected":""}`} onClick={()=>setAcct(t)} style={{textAlign:"center",padding:14}}>
              <i className={`ti ${t==="client"?"ti-user":"ti-scissors"}`} style={{fontSize:22,color:"var(--pink)"}} aria-hidden="true"></i>
              <div style={{fontSize:14,fontWeight:500,marginTop:6,textTransform:"capitalize"}}>{t}</div>
              <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:2}}>{t==="client"?"Build outfits, chat with stylists":"Manage clients, grow your business"}</div>
            </div>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        <input className="input-field" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input-field" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input-field" type="password" placeholder="Create password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)} />
        {acct==="stylist" && (
          <input className="input-field" placeholder="Your styling specialty (e.g. Business casual)" value={specialty} onChange={e=>setSpecialty(e.target.value)} />
        )}
        <button className="btn-pink" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="spinner"></span> : "Continue"}
        </button>
      </div>
    </div>
  );
}

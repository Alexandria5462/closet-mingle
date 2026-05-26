import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    try {
      await login(email, password);
    } catch(e) {
      setError("Invalid email or password.");
    }
    setLoading(false);
  }

  return (
    <div className="screen" style={{paddingBottom:0}}>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <button onClick={()=>nav("/")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-secondary)",fontSize:13}}>Back</button>
      </div>
      <div className="body" style={{paddingTop:24}}>
        <div className="section-label">Sign in</div>
        {error && <p className="error-text">{error}</p>}
        <input className="input-field" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input-field" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        <button className="btn-pink" onClick={handleLogin} disabled={loading}>
          {loading ? <span className="spinner"></span> : "Sign in"}
        </button>
        <p style={{textAlign:"center",marginTop:16,fontSize:13,color:"var(--text-secondary)"}}>
          Don't have an account?{" "}
          <span style={{color:"var(--pink)",cursor:"pointer"}} onClick={()=>nav("/signup")}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

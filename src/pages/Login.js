import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      // Fetch account type directly from Firestore
      const userDoc = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${result.user.uid}`,
        { headers: { "Authorization": `Bearer ${await result.user.getIdToken()}` } }
      );
      const userData = await userDoc.json();
      const accountType = userData?.fields?.accountType?.stringValue || "client";
      if (accountType === "stylist") {
        nav("/stylist", { replace: true });
      } else {
        nav("/home", { replace: true });
      }
    } catch (e) {
      console.error("Login error:", e);
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!resetEmail) { setError("Please enter your email address."); return; }
    setResetLoading(true);
    setError("");
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (e) {
      setError("Could not send reset email. Please check the email address.");
    }
    setResetLoading(false);
  }

  // Forgot password screen
  if (showForgot) {
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}>Closet<span>Mingle</span></div>
          <button onClick={() => { setShowForgot(false); setResetSent(false); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Back</button>
        </div>
        <div className="body" style={{ paddingTop: 32 }}>
          {resetSent ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
                We sent a password reset link to <strong>{resetEmail}</strong>. Check your inbox and follow the instructions.
              </div>
              <button className="btn-pink" onClick={() => { setShowForgot(false); setResetSent(false); }} style={{ width: "auto", padding: "12px 32px" }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Forgot your password?</div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Enter your email and we will send you a reset link
                </div>
              </div>
              {error && <p className="error-text">{error}</p>}
              <input
                className="input-field"
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
              />
              <button className="btn-pink" onClick={handleForgotPassword} disabled={resetLoading || !resetEmail}>
                {resetLoading ? <span className="spinner"></span> : "Send reset link"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}>Closet<span>Mingle</span></div>
        <button onClick={() => nav("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Back</button>
      </div>
      <div className="body" style={{ paddingTop: 24 }}>
        <div className="section-label">Sign in</div>
        {error && <p className="error-text">{error}</p>}
        <input
          className="input-field"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        {/* Forgot password link */}
        <div style={{ textAlign: "right", marginTop: -8, marginBottom: 14 }}>
          <span
            onClick={() => { setShowForgot(true); setResetEmail(email); setError(""); }}
            style={{ fontSize: 13, color: "var(--pink)", cursor: "pointer" }}
          >
            Forgot password?
          </span>
        </div>
        <button className="btn-pink" onClick={handleLogin} disabled={loading}>
          {loading ? <span className="spinner"></span> : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/signup")}>Sign up</span>
        </p>
        {/* Legal links */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-tertiary)" }}>
          By signing in you agree to our{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/terms")}>Terms of Service</span>
          {" "}and{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/privacy")}>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}

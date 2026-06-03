import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { getAuth, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator } from "firebase/auth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // MFA steps
  const [mfaStep, setMfaStep] = useState(null); // null | "choose" | "email" | "phone"
  const [mfaCode, setMfaCode] = useState("");
  const [mfaResolver, setMfaResolver] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // Navigation handled by App.js
    } catch (e) {
      // Check if MFA is required
      if (e.code === "auth/multi-factor-auth-required") {
        setMfaResolver(e.resolver);
        setMfaStep("choose");
        setLoading(false);
        return;
      }
      setError("Invalid email or password.");
    }
    setLoading(false);
  }

  async function sendEmailMFACode() {
    setSendingCode(true);
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCodeSent(true);
        setMfaStep("email");
      }
    } catch (e) {
      setError("Failed to send email code. Try again.");
    }
    setSendingCode(false);
  }

  async function sendPhoneMFACode() {
    setSendingCode(true);
    try {
      const auth = getAuth();
      // Set up reCAPTCHA verifier
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      const phoneInfoOptions = {
        multiFactorHint: mfaResolver.hints[0],
        session: mfaResolver.session,
      };
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier);
      setVerificationId(vId);
      setCodeSent(true);
      setMfaStep("phone");
    } catch (e) {
      setError("Failed to send SMS code. Try again.");
    }
    setSendingCode(false);
  }

  async function verifyMFACode() {
    if (!mfaCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      let credential;
      if (mfaStep === "phone") {
        const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, mfaCode);
        credential = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      }
      await mfaResolver.resolveSignIn(credential);
      // Login successful — App.js handles navigation
    } catch (e) {
      setError("Invalid code. Please try again.");
    }
    setLoading(false);
  }

  // MFA choose method screen
  if (mfaStep === "choose") {
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}>Closet<span>Mingle</span></div>
        </div>
        <div className="body" style={{ paddingTop: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Verify your identity</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Choose how you want to receive your verification code</div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-pink" onClick={sendEmailMFACode} disabled={sendingCode} style={{ marginBottom: 10 }}>
            {sendingCode ? <span className="spinner"></span> : <><i className="ti ti-mail" aria-hidden="true"></i> Send code to my email</>}
          </button>
          <button className="btn-outline" onClick={sendPhoneMFACode} disabled={sendingCode}>
            {sendingCode ? <span className="spinner"></span> : <><i className="ti ti-device-mobile" aria-hidden="true"></i> Send code to my phone</>}
          </button>
          <div id="recaptcha-container"></div>
        </div>
      </div>
    );
  }

  // MFA code entry screen
  if (mfaStep === "email" || mfaStep === "phone") {
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/")}>Closet<span>Mingle</span></div>
          <button onClick={() => setMfaStep("choose")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Back</button>
        </div>
        <div className="body" style={{ paddingTop: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{mfaStep === "email" ? "📧" : "📱"}</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Enter your code</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {mfaStep === "email"
                ? "We sent a 6-digit code to your email address"
                : "We sent a 6-digit code to your phone number"
              }
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <input
            className="input-field"
            type="number"
            placeholder="Enter 6-digit code"
            value={mfaCode}
            onChange={e => setMfaCode(e.target.value)}
            maxLength={6}
            style={{ textAlign: "center", fontSize: 22, letterSpacing: 8 }}
          />
          <button className="btn-pink" onClick={verifyMFACode} disabled={loading || mfaCode.length < 6}>
            {loading ? <span className="spinner"></span> : "Verify"}
          </button>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
            Did not receive it?{" "}
            <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => setMfaStep("choose")}>Try again</span>
          </p>
        </div>
      </div>
    );
  }

  // Normal login screen
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
        <button className="btn-pink" onClick={handleLogin} disabled={loading}>
          {loading ? <span className="spinner"></span> : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <span style={{ color: "var(--pink)", cursor: "pointer" }} onClick={() => nav("/signup")}>Sign up</span>
        </p>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

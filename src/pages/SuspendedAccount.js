import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

/**
 * SuspendedAccount
 * Shown instead of any app page when userProfile.accountSuspended === true.
 * This is NOT a permanent ban — it's a pause pending manual review after
 * 3+ pending reports. The account owner can still sign out and contact support.
 *
 * Route: /suspended — intentionally outside PrivateRoute so a suspended
 * user can always reach this page rather than looping in redirects.
 */
export default function SuspendedAccount() {
  const nav = useNavigate();
  const { userProfile, logout } = useAuth();

  async function handleSignOut() {
    await logout();
    nav("/");
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
        <i className="ti ti-shield-pause" style={{ fontSize: 56, color: "var(--text-tertiary)", display: "block", marginBottom: 20 }} aria-hidden="true"></i>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
          Your account is under review
        </div>

        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24, maxWidth: 320 }}>
          We've temporarily paused access to your account while our team reviews recent activity. This is not a permanent decision — most reviews are completed within 24–48 hours.
        </div>

        <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", marginBottom: 24, width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What happens next</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Our team reviews the reports on file for your account. If everything checks out, access is restored automatically. If a violation of our{" "}
            <span style={{ color: "var(--pink-dark)", textDecoration: "underline", cursor: "pointer" }} onClick={() => nav("/trust-safety")}>Community Guidelines</span>{" "}
            is confirmed, you'll be notified by email with more information.
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 28 }}>
          Questions? Reach out to{" "}
          <a href="mailto:support@closetmingle.com" style={{ color: "var(--pink-dark)" }}>support@closetmingle.com</a>{" "}
          and include your account email.
        </div>

        <button className="btn-outline" onClick={handleSignOut} style={{ width: "auto", padding: "12px 32px" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

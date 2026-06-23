import React from "react";
import { useNavigate } from "react-router-dom";

export default function TrustSafety() {
  const nav = useNavigate();
  const APP = "ClosetMingle";

  const sections = [
    {
      title: "Treat everyone with respect",
      content: "ClosetMingle connects real people — clients and stylists — for genuine styling help. Harassment, hate speech, threats, or abusive language toward another user will not be tolerated and may result in account suspension."
    },
    {
      title: "Keep payments on the platform",
      content: `Always book and pay through ${APP}. If anyone asks you to pay outside the app, communicate via another platform exclusively, or send money directly, treat this as a red flag and report it immediately. Payments made outside the app are not protected by our refund or dispute process.`
    },
    {
      title: "Be who you say you are",
      content: "Profiles must use real names, real photos, and accurate information. Impersonating another person, using a fake profile, or misrepresenting your identity, qualifications, or experience as a stylist is a violation of our guidelines."
    },
    {
      title: "No inappropriate content",
      content: "Sexual content, nudity, graphic violence, or any content that sexualizes or endangers minors is strictly prohibited and will result in immediate account termination and may be reported to law enforcement."
    },
    {
      title: "Respect privacy",
      content: "Closet photos, messages, and personal details shared on the platform are private between you and the other user. Do not screenshot, share, or distribute another user's private content without their permission."
    },
    {
      title: "Report, don't retaliate",
      content: "If something feels wrong — harassment, a scam attempt, inappropriate behavior — use the report option on that user's profile or in your chat with them. Our team reviews every report. Please don't attempt to handle serious concerns on your own."
    },
    {
      title: "What happens after a report",
      content: "Every report is reviewed by our team, typically within 24–48 hours. Accounts with multiple reports pending review may be temporarily suspended while we investigate. This protects the community while we look into what happened — it is not an automatic final decision."
    },
  ];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "14px 20px", paddingTop: "max(14px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
        </button>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Trust & Safety</div>
      </div>

      <div style={{ padding: "20px 24px", paddingBottom: 40 }}>

        <div style={{ background: "var(--avatar-bg)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "16px 18px", marginBottom: 24 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: "var(--pink-dark)", display: "block", marginBottom: 8 }} aria-hidden="true"></i>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Our commitment to you</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {APP} is built on real connections between clients and stylists. We take the safety of everyone on this platform seriously — these guidelines explain what we expect from our community and what we do to protect it.
          </div>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Community Guidelines</div>

        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
              {s.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: 30 }}>
              {s.content}
            </div>
          </div>
        ))}

        {/* Reporting CTA */}
        <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", marginTop: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>See something concerning?</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Tap the flag icon on any profile or in a chat to report a user. Every report is confidential and reviewed by our team.
          </div>
        </div>

        {/* Links to legal pages */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Related policies
        </div>
        <button
          onClick={() => nav("/terms")}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit" }}
        >
          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>Terms of Service</span>
          <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
        </button>
        <button
          onClick={() => nav("/privacy")}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit" }}
        >
          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>Privacy Policy</span>
          <i className="ti ti-chevron-right" style={{ color: "var(--text-tertiary)" }} aria-hidden="true"></i>
        </button>

        <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", marginTop: 24 }}>
          Questions about safety? Email{" "}
          <a href="mailto:support@closetmingle.com" style={{ color: "var(--pink-dark)" }}>support@closetmingle.com</a>
        </div>
      </div>
    </div>
  );
}

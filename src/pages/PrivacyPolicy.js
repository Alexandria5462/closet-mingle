import React from "react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const nav = useNavigate();
  const LAST_UPDATED = "January 1, 2026";
  const COMPANY = "Closet Mingle LLC";
  const EMAIL = "privacy@closetmingle.com";
  const APP = "ClosetMingle";

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "14px 20px", paddingTop: "max(14px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
        </button>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Privacy Policy</div>
      </div>

      <div style={{ padding: "20px 24px", paddingBottom: 40 }}>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>Last updated: {LAST_UPDATED}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
          {COMPANY} ("we," "us," or "our") operates the {APP} mobile application and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. Please read this policy carefully.
        </div>

        {[
          {
            title: "1. Information We Collect",
            content: [
              "Account Information: Name, email address, username, phone number, profile photo, city/location, and password when you create an account.",
              "Profile Information: About me description, styling specialty (for stylists), years of experience, and subscription tier.",
              "Clothing and Wardrobe Data: Photos of clothing items you upload, AI-detected attributes including colors, patterns, materials, and style categories.",
              "Style Preferences: Answers to the style profile quiz, liked items, saved outfits, and swipe history.",
              "Communication Data: Messages exchanged between clients and stylists, video session metadata (we do not record video sessions), and photo shares.",
              "Payment Information: Payment is processed by Stripe. We do not store your full credit card number. We receive transaction confirmations and subscription status from Stripe.",
              "Usage Data: App interactions, features used, session durations, device information, IP address, and browser type.",
              "Referral Data: Referral codes created and used, friend invitations sent.",
            ]
          },
          {
            title: "2. How We Use Your Information",
            content: [
              "To provide, operate, and maintain the App and its features.",
              "To process payments and manage subscriptions.",
              "To connect clients with stylists and facilitate styling sessions.",
              "To power AI features including clothing analysis, outfit generation, and stylist matching.",
              "To send notifications about messages, session updates, and platform activity.",
              "To improve our App and develop new features.",
              "To comply with legal obligations.",
              "To prevent fraud and ensure platform safety.",
            ]
          },
          {
            title: "3. Information Sharing",
            content: [
              "With Stylists: When you engage a stylist, they can see your profile, style quiz results, and messages you send them.",
              "With Other Users: Your username, profile photo, location (city only), and reviews you write are visible to other users.",
              "Service Providers: We share data with Cloudinary (photo storage), Anthropic (AI analysis), Stripe (payments), Daily.co (video), and Firebase (database). These providers are contractually bound to protect your data.",
              "Legal Requirements: We may disclose your information if required by law, court order, or government request.",
              "Business Transfers: In the event of a merger or acquisition, your information may be transferred to the new entity.",
              "We do not sell your personal information to third parties.",
            ]
          },
          {
            title: "4. AI and Photo Analysis",
            content: [
              "When you upload clothing photos, we send them to Anthropic's Claude AI to detect colors, patterns, materials, and style attributes.",
              "Your photos are also stored on Cloudinary, which may process them for background removal and optimization.",
              "AI-detected clothing attributes are stored in our database and used to generate outfit recommendations.",
              "We do not use your clothing photos to train AI models without your explicit consent.",
            ]
          },
          {
            title: "5. Data Retention",
            content: [
              "Account data is retained until you delete your account.",
              "Free tier: Liked items expire after 24 hours. Saved outfits expire after 24 hours.",
              "Premium AI: No expiry on liked items or saved outfits.",
              "Premium Plus: Liked items have no expiry. Saved outfits are retained for 7 days.",
              "After account deletion, we retain anonymized usage data for analytics purposes. All personal data is deleted within 30 days of account deletion.",
            ]
          },
          {
            title: "6. Your Rights",
            content: [
              "Access: You can request a copy of the personal data we hold about you.",
              "Correction: You can update your personal information through Account settings.",
              "Deletion: You can delete your account through Account → Settings → Delete my account. This permanently removes all your data.",
              "Portability: You can request an export of your data by contacting us.",
              "Opt-out: You can opt out of promotional notifications through Account → Settings → Notification preferences.",
              "GDPR Rights: If you are in the European Union, you have additional rights under GDPR including the right to restrict processing and the right to object.",
              "CCPA Rights: If you are a California resident, you have rights under the California Consumer Privacy Act including the right to know, delete, and opt-out of sale of personal information.",
            ]
          },
          {
            title: "7. Data Security",
            content: [
              "We implement industry-standard security measures including HTTPS encryption, Firebase security rules, and secure API key management.",
              "Passwords are hashed and never stored in plain text.",
              "API keys and sensitive credentials are stored as encrypted environment variables, never in source code.",
              "Despite our efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.",
            ]
          },
          {
            title: "8. Children's Privacy",
            content: [
              "The App is not directed to children under 13. We do not knowingly collect personal information from children under 13.",
              "If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information.",
              "If you believe we have collected information from a child under 13, please contact us immediately at " + EMAIL,
            ]
          },
          {
            title: "9. Third-Party Services",
            content: [
              "Cloudinary: Photo storage and optimization. Privacy policy at cloudinary.com/privacy",
              "Anthropic: AI clothing analysis. Privacy policy at anthropic.com/privacy",
              "Stripe: Payment processing. Privacy policy at stripe.com/privacy",
              "Daily.co: Video calling. Privacy policy at daily.co/privacy",
              "Firebase/Google: Database and authentication. Privacy policy at firebase.google.com/support/privacy",
            ]
          },
          {
            title: "10. International Transfers",
            content: "Your information may be transferred to and processed in countries other than your country of residence, including the United States. These countries may have different data protection laws. We ensure appropriate safeguards are in place for such transfers."
          },
          {
            title: "11. Push Notifications",
            content: "With your permission, we may send push notifications about new messages, session updates, and platform activity. You can manage notification preferences in Account → Settings → Notification preferences or through your device settings."
          },
          {
            title: "12. Changes to This Policy",
            content: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the App and updating the Last Updated date. Your continued use of the App after changes constitutes acceptance of the new policy."
          },
          {
            title: "13. Contact Us",
            content: `For privacy questions, data requests, or to exercise your rights, contact our Privacy Team:\n\nEmail: ${EMAIL}\nCompany: ${COMPANY}\nLocation: Davie, Florida, United States\n\nWe will respond to privacy requests within 30 days.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{section.title}</div>
            {Array.isArray(section.content) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {section.content.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    <span style={{ color: "var(--pink)", flexShrink: 0 }}>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{section.content}</div>
            )}
          </div>
        ))}

        <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16, fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
          © 2026 {COMPANY}. All rights reserved.
        </div>
      </div>
    </div>
  );
}

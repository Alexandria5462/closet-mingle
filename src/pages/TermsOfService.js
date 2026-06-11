import React from "react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const nav = useNavigate();
  const LAST_UPDATED = "January 1, 2026";
  const COMPANY = "Closet Mingle LLC";
  const EMAIL = "legal@closetmingle.com";
  const APP = "ClosetMingle";

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)", padding: "14px 20px", paddingTop: "max(14px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
        </button>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Terms of Service</div>
      </div>

      <div style={{ padding: "20px 24px", paddingBottom: 40 }}>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>Last updated: {LAST_UPDATED}</div>

        {[
          {
            title: "1. Acceptance of Terms",
            content: `By downloading, accessing, or using ${APP} (the "App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App. These Terms constitute a legally binding agreement between you and ${COMPANY} ("Company," "we," "us," or "our").`
          },
          {
            title: "2. Description of Service",
            content: `${APP} is an AI-powered personal styling platform that allows users to organize their wardrobe, generate outfit suggestions, and connect with professional stylists. The App is available through our website and mobile applications.`
          },
          {
            title: "3. Eligibility",
            content: "You must be at least 13 years of age to use this App. If you are under 18, you must have your parent or legal guardian's permission to use the App. By using the App, you represent and warrant that you meet the eligibility requirements."
          },
          {
            title: "4. User Accounts and Usernames",
            content: "You must create an account to use most features of the App. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Your username must be appropriate, non-offensive, and not impersonate another person or entity. We reserve the right to reclaim or modify usernames that violate these guidelines."
          },
          {
            title: "5. Subscriptions and Payments",
            content: `${APP} offers the following plans: Free (no charge), Premium AI ($9.99/month), Premium Plus ($19.99/month), and Stylist Subscription ($20/month or $200/year). Stylists set their own booking rates for monthly and per-session bookings with clients. All payments are processed securely through Stripe. Subscriptions automatically renew unless cancelled before the renewal date. You may cancel at any time through your Account settings. Refunds are issued at our discretion.`
          },
          {
            title: "6. Stylist Revenue Share",
            content: "Stylists who conduct Pay Per Session ($9.99) sessions receive 70% of the session fee ($6.93); ClosetMingle retains 30% as a platform fee. Tips sent by clients are paid 100% to the stylist — ClosetMingle does not take any portion of tips. Monthly and Premium subscription fees paid by clients are platform revenue and are not shared with stylists. Payments are subject to Stripe's terms and processing times."
          },
          {
            title: "7. User Content",
            content: "You retain ownership of content you upload to the App, including photos of your clothing items. By uploading content, you grant the Company a non-exclusive, worldwide, royalty-free license to use, display, and process your content for the purpose of providing the Service. You are responsible for ensuring you have the right to upload any content you submit."
          },
          {
            title: "8. AI-Generated Content",
            content: "The App uses artificial intelligence to analyze your clothing and generate outfit suggestions. AI-generated content is provided for informational and entertainment purposes only. We do not guarantee the accuracy, quality, or appropriateness of AI-generated outfit recommendations. The AI analyzes images you upload and detects colors, patterns, and materials to make suggestions."
          },
          {
            title: "9. Stylist Services",
            content: "Stylists on the platform are independent contractors, not employees of the Company. The Company does not guarantee the quality, safety, or legality of services provided by stylists. Users engage with stylists at their own risk. The Company is not responsible for any disputes between users and stylists."
          },
          {
            title: "10. Prohibited Conduct",
            content: "You agree not to: upload illegal, harmful, or inappropriate content; harass, abuse, or threaten other users; attempt to hack, reverse engineer, or interfere with the App; create multiple accounts to circumvent restrictions; use the App for any unlawful purpose; share explicit, sexual, or offensive content; impersonate any person or entity."
          },
          {
            title: "11. Privacy",
            content: "Your use of the App is subject to our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to the collection, use, and sharing of your information as described in the Privacy Policy."
          },
          {
            title: "12. Intellectual Property",
            content: `All content, features, and functionality of the App, including but not limited to text, graphics, logos, and software, are owned by ${COMPANY} or its licensors and are protected by applicable intellectual property laws.`
          },
          {
            title: "13. Disclaimers",
            content: `THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. THE COMPANY DOES NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED. YOUR USE OF THE APP IS AT YOUR SOLE RISK.`
          },
          {
            title: "14. Limitation of Liability",
            content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`
          },
          {
            title: "15. Termination",
            content: "We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the App will immediately cease. Sections of these Terms that by their nature should survive termination will survive."
          },
          {
            title: "16. Governing Law",
            content: "These Terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved through binding arbitration in accordance with the American Arbitration Association rules."
          },
          {
            title: "17. Changes to Terms",
            content: "We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the new Terms in the App and updating the Last Updated date. Your continued use of the App after changes constitutes acceptance of the new Terms."
          },
          {
            title: "18. Contact Us",
            content: `If you have questions about these Terms, please contact us at ${EMAIL} or write to us at ${COMPANY}, Davie, Florida, United States.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{section.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{section.content}</div>
          </div>
        ))}

        <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16, fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
          © 2026 {COMPANY}. All rights reserved.
        </div>
      </div>
    </div>
  );
}

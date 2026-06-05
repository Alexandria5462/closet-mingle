export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { plan, recipientEmail, recipientName, fromUserName, message } = req.body;
    // Generate a unique gift code
    const giftCode = `CMGIFT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    // In production this would trigger a Stripe payment and send an email
    return res.status(200).json({
      success: true,
      giftCode,
      message: `Gift code ${giftCode} created for ${recipientEmail}. Email sending will be enabled when email service is configured.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

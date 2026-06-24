// Minimum and maximum tip amounts — adjust to match your actual product decision.
// Hard limits exist so a malformed or malicious request body can never
// record an absurd or negative amount, even before Stripe is wired in.
const MIN_TIP = 1;
const MAX_TIP = 500;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, stylistId, clientId, conversationId } = req.body;

    // Validate stylistId and clientId are present and look like real Firebase UIDs,
    // not just "truthy" — an empty object or array would pass a bare !stylistId check.
    if (typeof stylistId !== "string" || stylistId.length < 10) {
      return res.status(400).json({ error: "Valid stylistId is required." });
    }
    if (clientId && (typeof clientId !== "string" || clientId.length < 10)) {
      return res.status(400).json({ error: "Invalid clientId." });
    }

    // Validate amount is a real finite number within sane bounds —
    // never trust a client-sent value as-is, even pre-Stripe.
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "A valid tip amount is required." });
    }
    if (numericAmount < MIN_TIP || numericAmount > MAX_TIP) {
      return res.status(400).json({ error: `Tip amount must be between $${MIN_TIP} and $${MAX_TIP}.` });
    }

    // Round to 2 decimal places server-side — never trust client-side rounding
    const safeAmount = Math.round(numericAmount * 100) / 100;

    // Tips: stylist keeps 100% — ClosetMingle does not take a cut of tips
    // Stripe Connect processing will be enabled when payment integration is activated.
    // IMPORTANT: once Stripe is live, this handler must also verify the
    // caller is authenticated as the actual client in this conversation
    // (e.g. via a verified Firebase ID token) before processing any charge.
    return res.status(200).json({
      success: true,
      amount: safeAmount,
      stylistAmount: safeAmount,   // 100% to stylist
      platformAmount: 0,            // 0% platform cut on tips
      message: "Tip recorded. Payment processing will be enabled when Stripe Connect is activated."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

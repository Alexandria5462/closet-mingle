export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, stylistId, clientId, conversationId } = req.body;
    if (!amount || !stylistId) return res.status(400).json({ error: "amount and stylistId required" });
    // Tips: stylist keeps 100% — ClosetMingle does not take a cut of tips
    // Stripe Connect processing will be enabled when payment integration is activated
    return res.status(200).json({
      success: true,
      amount,
      stylistAmount: parseFloat(amount.toFixed(2)), // 100% to stylist
      platformAmount: 0,                             // 0% platform cut on tips
      message: "Tip recorded. Payment processing will be enabled when Stripe Connect is activated."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

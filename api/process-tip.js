export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, stylistId, clientId, conversationId } = req.body;
    if (!amount || !stylistId) return res.status(400).json({ error: "amount and stylistId required" });
    // Stripe tip processing would go here when Stripe Connect is set up
    // For now just return success and the app records it in Firebase
    return res.status(200).json({
      success: true,
      amount,
      stylistAmount: parseFloat((amount * 0.7).toFixed(2)),
      platformAmount: parseFloat((amount * 0.3).toFixed(2)),
      message: "Tip recorded. Payment processing will be enabled when Stripe Connect is activated."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

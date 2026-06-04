export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageUrl, category, name } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text: `Analyze this ${category} clothing item called "${name}".

For primaryColor you MUST pick the single closest match from ONLY this exact list:
black, white, grey, cream, ecru, beige, tan, camel, brown, chocolate, mocha, navy, blue, cobalt, "powder blue", "light blue", "forest green", green, olive, sage, red, burgundy, wine, maroon, pink, blush, coral, peach, orange, rust, terracotta, "burnt orange", lavender, lilac, purple, mauve, yellow, mustard, gold, "butter yellow", "off white", ivory, silver, "rose gold", teal, turquoise, mint, "hot pink", fuchsia, "champagne", "caramel", "cognac", "slate", "charcoal", "nude", "sand"

Return ONLY this JSON with no other text:
{"primaryColor":"exact name from list above","secondaryColor":"exact name from list or null","pattern":"solid/striped/plaid/floral/graphic/animal print/geometric/other","material":"cotton/denim/silk/wool/polyester/leather/linen/velvet/satin/knit/unknown","style":"casual/formal/business/sporty/classic/streetwear/bohemian","fit":"fitted/loose/oversized/standard"}`
            }
          ]
        }]
      }),
    });

    if (!response.ok) {
      return res.status(500).json({
        attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" }
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const attributes = JSON.parse(clean);
    return res.status(200).json({ attributes });

  } catch (err) {
    console.error("Analyze error:", err.message);
    return res.status(500).json({
      attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" }
    });
  }
}

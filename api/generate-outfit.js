export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items, occasion } = req.body;

    if (!items || items.length < 2) {
      return res.status(400).json({ error: "Need at least 2 items" });
    }

    const descriptions = items.map(item => ({
      id: item.id || item.itemId,
      name: item.name,
      category: item.category,
      primaryColor: item.attributes?.primaryColor || "unknown",
      secondaryColor: item.attributes?.secondaryColor || null,
      pattern: item.attributes?.pattern || "solid",
      material: item.attributes?.material || "unknown",
      style: item.attributes?.style || "casual",
    }));

    const prompt = `You are an expert fashion stylist. Create 3 complete outfit combinations from these clothing items for the occasion: "${occasion}".

AVAILABLE ITEMS:
${descriptions.map(d => `- ID: ${d.id} | Name: "${d.name}" | Category: ${d.category} | Color: ${d.primaryColor}${d.secondaryColor ? " + " + d.secondaryColor : ""} | Pattern: ${d.pattern} | Material: ${d.material} | Style: ${d.style}`).join("\n")}

RULES:
1. MUST include (top or outerwear) + bottom OR a dress
2. Include shoes if available
3. Include accessories only if they complement the color/pattern combo
4. Use real color theory — complementary, analogous, neutral, or monochromatic
5. Never pair two busy patterns together
6. Make all 3 outfits DIFFERENT combinations

Return ONLY a valid JSON array, no other text:
[
  {
    "outfitName": "Creative outfit name",
    "selectedIds": ["exact_id_1", "exact_id_2", "exact_id_3"],
    "colorStory": "Specific explanation of why these colors work together",
    "patternNote": "How the patterns complement each other",
    "styleNote": "Why this works for ${occasion}",
    "colorHarmony": "complementary OR analogous OR neutral OR monochromatic"
  }
]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", errText);
      return res.status(500).json({ error: "AI generation failed", details: errText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const startIdx = clean.indexOf("[");
    const endIdx = clean.lastIndexOf("]");

    if (startIdx === -1 || endIdx === -1) {
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    const outfits = JSON.parse(clean.substring(startIdx, endIdx + 1));
    return res.status(200).json({ outfits });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}

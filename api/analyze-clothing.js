export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageUrl, category, name } = req.body;

    // ── Debug: log what we received ───────────────────────────
    console.log("analyze-clothing called:", { imageUrl: imageUrl?.slice(0, 80), category, name });

    // ── Check API key exists ──────────────────────────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is missing from environment variables");
      return res.status(200).json({
        attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" },
        error: "API key missing"
      });
    }

    // ── Check image URL exists ────────────────────────────────
    if (!imageUrl) {
      console.error("No imageUrl provided");
      return res.status(200).json({
        attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" },
        error: "No image URL"
      });
    }

    // ── Always strip background removal transformation ─────────
    // Background removal URLs cause 400 errors with Anthropic
    // because Cloudinary requires the paid addon to be active
    // We always use the original clean URL for analysis
    let cleanImageUrl = imageUrl;
    // Remove any Cloudinary transformations that might block access
    cleanImageUrl = cleanImageUrl.replace("/upload/e_background_removal/", "/upload/");
    cleanImageUrl = cleanImageUrl.replace("/upload/e_bgremoval/", "/upload/");
    // If URL still has transformations (anything between /upload/ and the filename)
    // strip them all to get the raw original image
    const uploadIndex = cleanImageUrl.indexOf("/upload/");
    if (uploadIndex !== -1) {
      const afterUpload = cleanImageUrl.slice(uploadIndex + 8);
      // Check if there are transformations (they contain _ or , characters before the folder/filename)
      if (afterUpload.startsWith("e_") || afterUpload.startsWith("f_") || afterUpload.startsWith("q_")) {
        const slashIndex = afterUpload.indexOf("/");
        if (slashIndex !== -1) {
          cleanImageUrl = cleanImageUrl.slice(0, uploadIndex + 8) + afterUpload.slice(slashIndex + 1);
        }
      }
    }

    console.log("Using image URL:", cleanImageUrl?.slice(0, 80));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: cleanImageUrl }
            },
            {
              type: "text",
              text: `Analyze this ${category || "clothing"} item called "${name || "item"}".

For primaryColor pick the single closest match from ONLY this list:
black, white, grey, charcoal, silver, cream, ecru, "off white", ivory, nude, champagne, brown, chocolate, mocha, caramel, cognac, camel, beige, tan, sand, navy, blue, cobalt, "powder blue", "light blue", teal, turquoise, slate, "forest green", green, olive, sage, mint, rust, terracotta, coral, peach, orange, pink, blush, "hot pink", fuchsia, "rose gold", lavender, lilac, purple, mauve, red, burgundy, wine, maroon, "butter yellow", yellow, gold, mustard

Return ONLY valid JSON with no other text:
{"primaryColor":"exact name from list","secondaryColor":"exact name from list or null","pattern":"solid/striped/plaid/floral/graphic/animal print/geometric/other","material":"cotton/denim/silk/wool/polyester/leather/linen/velvet/satin/knit/unknown","style":"casual/formal/business/sporty/classic/streetwear/bohemian","fit":"fitted/loose/oversized/standard"}`
            }
          ]
        }]
      }),
    });

    console.log("Anthropic response status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText.slice(0, 200));
      return res.status(200).json({
        attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" },
        error: `Anthropic error ${response.status}`
      });
    }

    const data = await response.json();
    console.log("Anthropic raw response:", JSON.stringify(data).slice(0, 300));

    const text = data.content?.[0]?.text || "{}";
    console.log("Text from Claude:", text);

    // Clean and parse JSON
    const clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");

    if (startIdx === -1 || endIdx === -1) {
      console.error("No JSON found in response:", clean);
      return res.status(200).json({
        attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" },
        error: "No JSON in response"
      });
    }

    const attributes = JSON.parse(clean.substring(startIdx, endIdx + 1));
    console.log("Parsed attributes:", JSON.stringify(attributes));

    return res.status(200).json({ attributes });

  } catch (err) {
    console.error("analyze-clothing handler error:", err.message);
    return res.status(200).json({
      attributes: { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" },
      error: err.message
    });
  }
}

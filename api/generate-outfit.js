export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items, occasion } = req.body;
    if (!items || items.length < 2) {
      return res.status(400).json({ error: "Need at least 2 items" });
    }

    // ── Try AI first ─────────────────────────────────────────
    try {
      const aiResult = await generateWithAI(items, occasion);
      if (aiResult && aiResult.length > 0) {
        return res.status(200).json({ outfits: aiResult, source: "ai" });
      }
    } catch (aiError) {
      console.error("AI failed, using fallback:", aiError.message);
    }

    // ── Fallback: smart style rules ───────────────────────────
    const fallbackResult = generateWithRules(items, occasion);
    return res.status(200).json({ outfits: fallbackResult, source: "rules" });

  } catch (err) {
    console.error("Handler error:", err.message);
    // Last resort fallback
    try {
      const { items, occasion } = req.body;
      const fallback = generateWithRules(items, occasion);
      return res.status(200).json({ outfits: fallback, source: "rules" });
    } catch (e) {
      return res.status(500).json({ error: err.message });
    }
  }
}

// ── Normalize category names ──────────────────────────────────
function normalizeCategory(cat) {
  if (!cat) return "other";
  const c = cat.toLowerCase().trim();
  if (["tops","top","shirt","blouse","tee","tank","sweater","crop"].some(x => c.includes(x))) return "tops";
  if (["outerwear","jacket","coat","blazer","hoodie","cardigan"].some(x => c.includes(x))) return "outerwear";
  if (["bottoms","bottom","pant","pants","jean","jeans","skirt","shorts","legging","trouser"].some(x => c.includes(x))) return "bottoms";
  if (["dresses","dress","romper","jumpsuit"].some(x => c.includes(x))) return "dresses";
  if (["shoes","shoe","boot","boots","sneaker","heel","sandal","loafer"].some(x => c.includes(x))) return "shoes";
  if (["accessories","accessory","bag","purse","belt","scarf","hat","necklace","earring","jewelry"].some(x => c.includes(x))) return "accessories";
  return c;
}

// ── AI Generation via Claude ──────────────────────────────────
async function generateWithAI(items, occasion) {
  const indexedItems = items.map((item, index) => ({
    index,
    originalId: item.id || item.itemId || `item_${index}`,
    name: item.name || "Unknown",
    category: normalizeCategory(item.category),
    primaryColor: item.attributes?.primaryColor || "unknown",
    pattern: item.attributes?.pattern || "solid",
    material: item.attributes?.material || "unknown",
    style: item.attributes?.style || "casual",
  }));

  const prompt = `You are an expert fashion stylist. Create 3 complete outfit combinations for occasion: "${occasion}".

ITEMS (use the index number to select them):
${indexedItems.map(d => `Index ${d.index}: "${d.name}" | ${d.category} | Color: ${d.primaryColor} | Pattern: ${d.pattern} | Material: ${d.material}`).join("\n")}

RULES:
1. Every outfit MUST have (tops or outerwear) + bottoms OR a dress
2. Add shoes index if available
3. Add accessories only if colors complement
4. Use real color theory - no clashing patterns
5. Make all 3 outfits DIFFERENT combinations

Return ONLY this JSON array with no other text:
[
  {
    "outfitName": "Creative name",
    "selectedIndexes": [0, 1, 2],
    "colorStory": "Why these colors work together",
    "patternNote": "How patterns complement each other",
    "styleNote": "Why this works for ${occasion}",
    "colorHarmony": "neutral"
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
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const startIdx = clean.indexOf("[");
  const endIdx = clean.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1) throw new Error("No JSON array in response");

  const aiOutfits = JSON.parse(clean.substring(startIdx, endIdx + 1));

  return aiOutfits.map(outfit => ({
    outfitName: outfit.outfitName || "Styled Look",
    selectedIds: (outfit.selectedIndexes || [])
      .map(idx => indexedItems[idx]?.originalId)
      .filter(Boolean),
    colorStory: outfit.colorStory || "",
    patternNote: outfit.patternNote || "",
    styleNote: outfit.styleNote || "",
    colorHarmony: outfit.colorHarmony || "neutral",
  })).filter(o => o.selectedIds.length >= 2);
}

// ── Rule-based fallback generation ───────────────────────────
function generateWithRules(items, occasion) {
  const normalized = items.map(i => ({
    ...i,
    originalId: i.id || i.itemId,
    normCat: normalizeCategory(i.category),
  }));

  const tops = normalized.filter(i => i.normCat === "tops" || i.normCat === "outerwear");
  const bottoms = normalized.filter(i => i.normCat === "bottoms");
  const dresses = normalized.filter(i => i.normCat === "dresses");
  const shoes = normalized.filter(i => i.normCat === "shoes");
  const accessories = normalized.filter(i => i.normCat === "accessories");

  const pick = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  const outfits = [];

  // Color pairing rules
  const colorPairs = {
    black: ["white","cream","grey","red","pink","gold"],
    white: ["black","navy","blue","grey","brown","pink"],
    navy: ["white","cream","grey","light blue","gold"],
    grey: ["white","black","navy","pink","red"],
    brown: ["white","cream","tan","olive","gold"],
    red: ["black","white","grey","navy"],
    pink: ["white","black","grey","navy","cream"],
  };

  for (let i = 0; i < 3; i++) {
    const outfit = [];
    const useDress = dresses.length > 0 && (tops.length === 0 || i === 2);

    if (useDress) {
      const d = pick(dresses);
      if (d) outfit.push(d);
    } else {
      const top = tops.length > i ? tops[i % tops.length] : pick(tops);
      const bottom = bottoms.length > i ? bottoms[i % bottoms.length] : pick(bottoms);
      if (top) outfit.push(top);
      if (bottom) outfit.push(bottom);
    }

    const shoe = pick(shoes);
    const acc = pick(accessories);
    if (shoe) outfit.push(shoe);
    if (acc) outfit.push(acc);

    if (outfit.length >= 2) {
      const mainItem = outfit[0];
      const mainColor = mainItem?.attributes?.primaryColor || "neutral";
      const pairs = colorPairs[mainColor?.toLowerCase()] || ["neutral tones"];

      outfits.push({
        outfitName: `${occasion} Look ${i + 1}`,
        selectedIds: outfit.map(item => item.originalId || item.id || item.itemId).filter(Boolean),
        colorStory: `${mainColor || "These"} tones pair well with ${pairs.slice(0, 2).join(" and ")} for a balanced look.`,
        patternNote: "Items are combined to avoid pattern clashing for a clean, cohesive style.",
        styleNote: `A well-balanced combination perfect for ${occasion}.`,
        colorHarmony: "neutral",
      });
    }
  }

  return outfits;
}

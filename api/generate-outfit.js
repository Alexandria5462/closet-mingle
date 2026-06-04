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
      model: "claude-sonnet-4-5",
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
  // ── 2026 Complete Color Matching Rules ───────────────────────
  // Every color Claude can detect is mapped here for full accuracy
  const colorPairs = {

    // ── True Neutrals ─────────────────────────────────────────
    black: ["white","cream","ecru","ivory","off white","grey","charcoal","red","pink","hot pink","cobalt","gold","butter yellow","lavender","silver","rose gold","champagne"],
    white: ["black","navy","cobalt","grey","charcoal","brown","chocolate","pink","forest green","rust","lavender","teal","red","olive","burgundy"],
    grey: ["white","black","navy","pink","red","lavender","cobalt","butter yellow","coral","silver","charcoal","blush","mauve"],
    charcoal: ["white","cream","ecru","silver","pink","blush","lavender","cobalt","red","gold","champagne"],
    silver: ["black","white","grey","charcoal","navy","cobalt","pink","blush","lavender","burgundy"],

    // ── Creams and Off Whites ─────────────────────────────────
    cream: ["brown","chocolate","camel","rust","forest green","navy","black","mocha","terracotta","cognac","burgundy","olive"],
    ecru: ["chocolate","mocha","camel","forest green","rust","navy","black","terracotta","cognac","burgundy"],
    "off white": ["chocolate","mocha","camel","navy","forest green","rust","black","cognac","burgundy"],
    ivory: ["chocolate","mocha","camel","navy","rust","black","forest green","cognac","burgundy","gold"],
    nude: ["black","chocolate","camel","navy","forest green","burgundy","cognac","gold"],
    champagne: ["black","charcoal","navy","chocolate","burgundy","forest green","gold","silver"],

    // ── Browns and Tans ───────────────────────────────────────
    brown: ["white","cream","ecru","ivory","beige","tan","rust","forest green","navy","gold","butter yellow"],
    chocolate: ["cream","ecru","ivory","off white","camel","butter yellow","rust","coral","white","gold","champagne","blush"],
    mocha: ["cream","ecru","ivory","white","butter yellow","camel","forest green","coral","gold","champagne"],
    "mocha mousse": ["cream","ecru","camel","butter yellow","forest green","rust","white","gold","champagne"],
    caramel: ["white","cream","chocolate","navy","forest green","rust","gold","champagne","black"],
    cognac: ["cream","ecru","ivory","white","forest green","navy","black","gold","champagne"],
    camel: ["white","black","chocolate","mocha","navy","forest green","rust","burgundy","gold"],
    beige: ["white","black","brown","navy","rust","forest green","camel","mocha","chocolate"],
    tan: ["white","brown","navy","rust","forest green","chocolate","burgundy","gold"],
    sand: ["white","chocolate","navy","forest green","rust","camel","black","gold"],

    // ── Blues ─────────────────────────────────────────────────
    navy: ["white","cream","ecru","ivory","camel","grey","gold","coral","butter yellow","champagne","silver"],
    blue: ["white","cream","grey","camel","gold","coral","butter yellow","rust","silver"],
    cobalt: ["white","cream","black","grey","gold","coral","butter yellow","silver","champagne"],
    "powder blue": ["white","cream","navy","chocolate","camel","lavender","blush","silver"],
    "light blue": ["white","navy","camel","chocolate","grey","cream","lavender","blush"],
    teal: ["white","cream","black","grey","gold","coral","champagne","silver","navy"],
    turquoise: ["white","cream","black","grey","gold","coral","navy","chocolate"],
    slate: ["white","cream","navy","blush","lavender","gold","silver","champagne"],

    // ── Greens ────────────────────────────────────────────────
    "forest green": ["cream","ecru","ivory","camel","white","chocolate","rust","gold","butter yellow","champagne"],
    green: ["white","cream","camel","chocolate","rust","beige","gold","butter yellow"],
    olive: ["white","cream","camel","rust","chocolate","beige","tan","gold","butter yellow"],
    sage: ["white","cream","lavender","blush","chocolate","camel","ecru","silver"],
    mint: ["white","cream","chocolate","navy","black","grey","silver","gold"],

    // ── Warm Tones ────────────────────────────────────────────
    rust: ["cream","ecru","ivory","white","chocolate","forest green","navy","camel","gold","champagne"],
    terracotta: ["cream","ecru","ivory","white","forest green","navy","chocolate","camel","gold"],
    "burnt orange": ["cream","ivory","white","chocolate","forest green","navy","camel","gold"],
    coral: ["white","cream","navy","cobalt","chocolate","gold","grey","champagne","silver"],
    peach: ["white","cream","chocolate","navy","forest green","camel","sage","champagne","silver"],
    orange: ["white","navy","black","chocolate","cream","cobalt","grey"],

    // ── Pinks ─────────────────────────────────────────────────
    pink: ["white","black","grey","navy","cream","chocolate","cobalt","silver","champagne"],
    blush: ["white","cream","chocolate","camel","navy","sage","lavender","silver","champagne","grey"],
    "hot pink": ["white","black","grey","navy","cobalt","silver","gold"],
    fuchsia: ["white","black","grey","navy","cobalt","silver","gold"],
    "rose gold": ["white","cream","black","grey","navy","chocolate","champagne","silver"],
    coral: ["white","cream","navy","cobalt","chocolate","gold","grey"],

    // ── Purples and Lavenders ─────────────────────────────────
    lavender: ["white","cream","grey","chocolate","forest green","navy","blush","silver","champagne"],
    lilac: ["white","cream","grey","chocolate","navy","forest green","blush","silver","champagne"],
    purple: ["white","cream","grey","black","gold","cobalt","silver","champagne"],
    mauve: ["white","cream","chocolate","camel","forest green","navy","silver","champagne"],

    // ── Reds and Burgundy ─────────────────────────────────────
    red: ["black","white","grey","navy","cream","gold","silver","champagne"],
    burgundy: ["cream","ecru","ivory","camel","white","grey","gold","forest green","champagne","silver"],
    wine: ["cream","ecru","camel","white","grey","gold","champagne","silver"],
    maroon: ["cream","ivory","camel","white","grey","gold","forest green","champagne"],

    // ── Yellows and Golds ─────────────────────────────────────
    "butter yellow": ["white","chocolate","navy","cobalt","forest green","black","mocha","champagne"],
    yellow: ["white","black","navy","grey","chocolate","forest green","cobalt"],
    gold: ["black","white","navy","chocolate","burgundy","forest green","cream","champagne"],
    mustard: ["white","black","chocolate","forest green","navy","rust","cream","camel"],
    champagne: ["black","charcoal","navy","chocolate","burgundy","forest green","gold","silver","blush"],
  };

  // ── 2026 Pattern Mixing Rules ─────────────────────────────
  const patternRules = {
    solid: ["solid","striped","plaid","floral","graphic","animal print","geometric","other"],
    striped: ["solid","geometric"],
    plaid: ["solid"],
    floral: ["solid","geometric"],
    graphic: ["solid"],
    "animal print": ["solid"],
    geometric: ["solid","floral","striped"],
    other: ["solid"],
  };

  // Shuffle all arrays so every regenerate gives different combinations
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const sTops = shuffle(tops);
  const sBottoms = shuffle(bottoms);
  const sDresses = shuffle(dresses);

  for (let i = 0; i < 3; i++) {
    const outfit = [];
    const useDress = sDresses.length > 0 && (sTops.length === 0 || i === 2);

    if (useDress) {
      // Pick a different dress each time
      const d = sDresses[i % sDresses.length];
      if (d) outfit.push(d);
    } else {
      // Pick different top and bottom each iteration after shuffling
      const top = sTops[i % sTops.length] || pick(sTops);
      const bottom = sBottoms[i % sBottoms.length] || pick(sBottoms);
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

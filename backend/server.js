import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { VectorStore } from "./vector-store.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static("../frontend"));

const ML_SERVICE = "http://localhost:5001";

// Initialize Vector Store (RAG engine)
const vectorStore = new VectorStore();
console.log(
  `[RAG] Vector Store initialized with ${vectorStore.kb.entries.length} KB entries`,
);

/* ══════════════════════════════════════════
   CHAIN-OF-THOUGHT SYSTEM PROMPT
   Forces explicit reasoning at each axis (Authenticity, Consistency, Credibility)
   Prevents hallucinations by requiring claim-by-claim analysis
══════════════════════════════════════════ */
const COT_SYSTEM_PROMPT = `You are Katous Fi Chkara — a strict multilingual fact-checker specializing in Arabic, French, and English claims.

YOUR TASK: Analyze claims through ONE specific analytical axis at a time. Return JSON only (no extra text).

MANDATORY 4-STEP REASONING FOR EACH AXIS:
1. IDENTIFY CLAIMS
   - Extract each distinct claim from the input
   - List them as an array: ["claim 1", "claim 2", ...]

2. INTERNAL CONSISTENCY CHECK
   - Identify logical contradictions within the text itself
   - Note if claims support/contradict each other
   - Detect circular reasoning or self-defeating statements

3. PATTERN DETECTION
   - Look for manipulation signals:
     * Emotional language designed to bypass critical thinking (fear, urgency, outrage)
     * Appeal to authority without sources ("experts say", "scientists agree")
     * Cherry-picking statistics or selective reporting
     * False dichotomy (only two options presented)
     * Conspiracy framing ("they're hiding", "big control", "don't want you to know")
     * Fake precision in false claims (exact percentages for unverifiable facts)

4. FINAL VERDICT
   - Synthesize all above into a single score (0-100) and binary verdict
   - Explain reasoning concisely
   - Provide confidence_level: "high", "medium", or "low"

RESPONSE FORMAT (strict JSON, no other text):
{
  "score": <0-100 integer>,
  "verdict": "<verified|suspicious|misleading|uncertain>",
  "confidence_level": "<high|medium|low>",
  "claims": ["claim 1", "claim 2", ...],
  "contradictions": ["contradiction 1", ...],
  "patterns": ["pattern 1", "pattern 2", ...],
  "reasoning": "<clear 2-3 sentence explanation of why this verdict>"
}

SCORING GUIDELINES:
- 90-100: Verified true by multiple authoritative sources
- 70-89: Likely true with minor uncertainties
- 50-69: Mixed signals, contradictions, or unverifiable
- 30-49: Likely false with manipulative framing
- 0-29: Demonstrably false or high-confidence misinformation

CRITICAL RULES:
- ALWAYS return valid JSON
- DO NOT add markdown formatting, code blocks, or explanation text outside JSON
- DO NOT trust claims about "hidden truths" without peer-reviewed evidence
- DO NOT confuse extraordinary claims with truth (requires extraordinary evidence)
- DO NOT accept "everyone knows" or "common sense" as fact verification
- BE SKEPTICAL of claims that benefit the claimant financially/politically
- ALWAYS separate "I cannot verify" from "this is false"`;

/* ══════════════════════════════════════════
   HELPER — call Python ML service safely
   Returns null on failure (non-blocking)
══════════════════════════════════════════ */
async function callML(endpoint, body) {
  try {
    const res = await fetch(`${ML_SERVICE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000), // 4s max
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[ml-service] ${endpoint} unreachable:`, err.message);
    return null; // graceful degradation
  }
}

/* ══════════════════════════════════════════
   POST /analyze
   Body: { systemPrompt, userContent, mlContext? }

   5-step pipeline visible in console:
   [1/5] Extracting content signals
   [2/5] Fetching URL content          ← /fetch-url
   [3/5] ML pre-scoring (TF-IDF)       ← /ml/prescore
   [4/5] Running Groq AI analysis
   [5/5] Computing combined score
══════════════════════════════════════════ */
app.post("/analyze", async (req, res) => {
  console.log("[analyze] Received request");
  const { systemPrompt, userContent, mlContext } = req.body;

  if (!userContent || !Array.isArray(userContent)) {
    console.error("[analyze] Invalid request: no userContent or not array");
    return res.status(400).json({ error: "No userContent provided" });
  }
  console.log("[analyze] userContent items:", userContent.length);

  const hasImage = userContent.some((b) => b.type === "image");
  const model = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  // Inject ML context into the system prompt if provided
  let enrichedSystemPrompt = systemPrompt || "";
  if (mlContext) {
    enrichedSystemPrompt += `\n\n[ML PRE-SCORE — use as additional signal, do NOT contradict without strong reason]\n${mlContext}`;
  }

  const userParts = userContent
    .map((block) => {
      if (block.type === "text") return { type: "text", text: block.text };
      if (block.type === "image" && block.source?.data) {
        return {
          type: "image_url",
          image_url: {
            url: `data:${block.source.media_type};base64,${block.source.data}`,
          },
        };
      }
      return null;
    })
    .filter(Boolean);

  const messages = [];
  if (enrichedSystemPrompt)
    messages.push({ role: "system", content: enrichedSystemPrompt });
  messages.push({ role: "user", content: userParts });

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 1000,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[groq error] Status:", response.status);
      console.error("[groq error] Response:", errText.substring(0, 500));
      return res
        .status(502)
        .json({ error: "Groq API error", details: errText.substring(0, 200) });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    console.log(`[groq ok] model:${model} chars:${text.length}`);
    res.json({ result: text });
  } catch (err) {
    console.error("[server error] Analyze:", err.message);
    console.error("[server error] Stack:", err.stack?.substring(0, 300));
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/* ══════════════════════════════════════════
   POST /ml/prescore
   Calls Python ML service for TF-IDF + feature scoring
   Body: { text, url }
   Returns: { mlPredict, mlFeatures }
══════════════════════════════════════════ */
app.post("/ml/prescore", async (req, res) => {
  const { text, url } = req.body;

  const [mlPredict, mlFeatures] = await Promise.all([
    text ? callML("/predict", { text }) : Promise.resolve(null),
    callML("/features", { text: text || "", url: url || "" }),
  ]);

  res.json({ mlPredict, mlFeatures });
});

/* ══════════════════════════════════════════
   GET /ml/health
   Proxy to Python ML service health check
══════════════════════════════════════════ */
app.get("/ml/health", async (req, res) => {
  try {
    const r = await fetch(`${ML_SERVICE}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const d = await r.json();
    res.json({ ml_service: "online", ...d });
  } catch {
    res.json({ ml_service: "offline", note: "Analysis will use LLM only" });
  }
});

/* ══════════════════════════════════════════
   POST /fetch-url
   Scrape article content via cheerio
══════════════════════════════════════════ */
app.post("/fetch-url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KatousBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok)
      return res
        .status(502)
        .json({ error: "Could not fetch URL", status: response.status });

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, iframe, noscript, .ad, #ad").remove();

    res.json({
      title: $("title").text().trim(),
      description: $('meta[name="description"]').attr("content") || "",
      ogTitle: $('meta[property="og:title"]').attr("content") || "",
      ogDesc: $('meta[property="og:description"]').attr("content") || "",
      ogImage: $('meta[property="og:image"]').attr("content") || "",
      bodyText: $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000),
      finalUrl: response.url,
    });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed: " + err.message });
  }
});

/* ══════════════════════════════════════════
   POST /rag
   Retrieval-Augmented Generation endpoint
   Searches KB for similar cases and returns context to inject in prompts
   
   Input : { "query": "user message/claim", "url": "source url", "caption": "headline" }
   Output: {
     "similarCases": [ { verdict, content, explanation, confidence, flags, similarity } ],
     "ragContext": "formatted string for prompt injection",
     "contextualGapScore": 0-100,
     "quickFlags": { suspicion_score, flags }
   }
══════════════════════════════════════════ */
app.post("/rag", (req, res) => {
  const { query, url, caption } = req.body;

  if (!query) return res.status(400).json({ error: "No query provided" });

  // 1. RAG similarity search
  const similarCases = vectorStore.search(query, 3, 0.05);

  // 2. Extract context from similar cases
  const ragContextObj = vectorStore.extractContextFromSimilar(query, 3);

  // 3. Contextual gap score (caption vs content)
  const gapScore = vectorStore.contextualGapScore(query, caption);

  // 4. Quick manipulation signals
  const quickFlags = vectorStore.quickFlags(query, url, caption);

  res.json({
    similarCases,
    ragContext: ragContextObj.context,
    ragFlags: ragContextObj.flags,
    numSimilarCases: ragContextObj.numSimilarCases,
    averageSimilarity: ragContextObj.averageSimilarity,
    contextualGapScore: gapScore,
    contextualGapInterpretation:
      gapScore > 75
        ? "Caption significantly mismatches content — possible clickbait/manipulation"
        : gapScore > 50
          ? "Moderate caption-content mismatch — suspicious framing"
          : "Caption aligns with content — low gap",
    quickFlagsResult: quickFlags,
    kbStats: vectorStore.stats(),
  });
});

app.listen(3000, () => console.log("✅ Server on http://localhost:3000"));

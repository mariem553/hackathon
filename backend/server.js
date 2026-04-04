import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static("../frontend"));

/* ══════════════════════════════════════════
   POST /analyze — Groq AI call
   Supports text + image (base64)
   Auto-selects vision model if image present
══════════════════════════════════════════ */
app.post("/analyze", async (req, res) => {
  const { systemPrompt, userContent } = req.body;

  if (!userContent || !Array.isArray(userContent)) {
    return res.status(400).json({ error: "No userContent provided" });
  }

  const hasImage = userContent.some((b) => b.type === "image");

  const model = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const userParts = userContent
    .map((block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text };
      }
      if (block.type === "image") {
        const dataUri = `data:${block.source.media_type};base64,${block.source.data}`;
        return {
          type: "image_url",
          image_url: { url: dataUri },
        };
      }
      return null;
    })
    .filter(Boolean);

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
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
      console.error("[groq error]", response.status, errText);
      return res
        .status(502)
        .json({ error: "Groq API error", details: errText });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    console.log("[groq ok] model:", model, "| chars:", text.length);
    res.json({ result: text });
  } catch (err) {
    console.error("[server error]", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/* ══════════════════════════════════════════
   POST /fetch-url — Real URL scraping
   Fetches HTML, extracts clean text via cheerio
   Used for real URL content analysis (not just domain)
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

    if (!response.ok) {
      return res.status(502).json({
        error: "Could not fetch URL",
        status: response.status,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, nav, footer, iframe, noscript, ads, .ad, #ad").remove();

    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const ogImage = $('meta[property="og:image"]').attr("content") || "";

    // Extract clean body text (max 3000 chars for token efficiency)
    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    console.log("[fetch-url ok]", url, "| chars:", bodyText.length);

    res.json({
      title,
      description,
      ogTitle,
      ogDesc,
      ogImage,
      bodyText,
      finalUrl: response.url,
    });
  } catch (err) {
    console.error("[fetch-url error]", err.message);
    res.status(500).json({ error: "Fetch failed: " + err.message });
  }
});

app.listen(3000, () =>
  console.log("✅ Server running on http://localhost:3000"),
);

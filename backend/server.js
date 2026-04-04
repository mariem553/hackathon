import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static("../frontend"));

app.post("/analyze", async (req, res) => {
  const { systemPrompt, userContent } = req.body;

  if (!userContent || !Array.isArray(userContent)) {
    return res.status(400).json({ error: "No userContent provided" });
  }

  /* ── Detect if this request contains an image ── */
  const hasImage = userContent.some((b) => b.type === "image");

  /* ── Choose model accordingly ── */
  const model = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  /* ── Build Groq messages array ── */
  const userParts = userContent
    .map((block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text };
      }
      if (block.type === "image") {
        // Groq vision expects a URL — we send base64 as data URI
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

app.listen(3000, () =>
  console.log("✅ Server running on http://localhost:3000"),
);

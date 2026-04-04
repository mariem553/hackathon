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
  const { prompt, systemPrompt, userContent } = req.body;

  let geminiParts = [];

  if (prompt) {
    geminiParts = [{ text: prompt }];
  } else if (userContent) {
    for (const block of userContent) {
      if (block.type === "text") {
        geminiParts.push({ text: block.text });
      } else if (block.type === "image" && block.source?.data) {
        geminiParts.push({
          inlineData: {
            mimeType: block.source.media_type || "image/jpeg",
            data: block.source.data,
          },
        });
      }
    }
    if (systemPrompt) {
      geminiParts.unshift({ text: systemPrompt + "\n\n---\n\n" });
    }
  } else {
    return res.status(400).json({ error: "No prompt or userContent provided" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: geminiParts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[gemini error]", response.status, errText);
      return res
        .status(502)
        .json({ error: "Gemini API error", details: errText });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    res.json({ result: text });
  } catch (err) {
    console.error("[server error]", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

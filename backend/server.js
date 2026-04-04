import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

app.post("/analyze", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.json({ result: text });
  } catch (err) {
    res.status(500).json({ error: "API call failed" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

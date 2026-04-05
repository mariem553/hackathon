import dotenv from "dotenv";
dotenv.config();

console.log("GROQ_API_KEY loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");
console.log("Key length:", process.env.GROQ_API_KEY?.length || 0);
console.log(
  "Key starts with:",
  process.env.GROQ_API_KEY?.substring(0, 10) || "null",
);

// Test a simple Groq call
const testPayload = {
  model: "llama-3.3-70b-versatile",
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    {
      role: "user",
      content: "Say 'Hello' only",
    },
  ],
  temperature: 0.2,
  max_tokens: 20,
};

console.log("\nTesting Groq API call...");
fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify(testPayload),
})
  .then((r) => {
    console.log("Groq Status:", r.status, r.statusText);
    return r.text();
  })
  .then((text) => {
    try {
      const json = JSON.parse(text);
      console.log("Groq Response:", JSON.stringify(json, null, 2));
    } catch {
      console.log("Raw Response:", text.substring(0, 200));
    }
  })
  .catch((err) => {
    console.error("Groq Error:", err.message);
  });

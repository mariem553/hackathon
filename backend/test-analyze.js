import fetch from "node-fetch";

const testPayload = {
  systemPrompt: "You are a fact checker",
  userContent: [
    {
      type: "text",
      text: "NASA released the deepest infrared image of the universe",
    },
  ],
};

console.log("Testing /analyze endpoint...");
console.log("Payload:", JSON.stringify(testPayload, null, 2));

fetch("http://localhost:3000/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testPayload),
})
  .then((r) => {
    console.log("Status:", r.status, r.statusText);
    return r.text();
  })
  .then((text) => {
    console.log("Response:", text);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });

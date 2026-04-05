/* ══════════════════════════════════════════
   قطوس في شكارة — Zaama Sahih?
   ✅ First message in Tunisian (captivating)
   ✅ Then switch to user's language
   ✅ Support images/videos/URLs + titles
   ✅ Source + content + caption (flexible)
══════════════════════════════════════════ */

/* ─── State ─── */
let pendingFile = null;
let pendingFileType = null;
let pendingFileB64 = null;
let currentLanguage = "en"; // Default, will detect from user

/* ══════════════════════════════════════════
   BOT AVATAR SVG (logo Katous)
══════════════════════════════════════════ */
const BOT_AVATAR_SVG = `
<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 17 Q8 13 12 13 L28 13 Q32 13 32 17 L30 34 Q30 36 28 36 L12 36 Q10 36 10 34 Z" fill="#1a1a28" stroke="#d4a8ff" stroke-width="1.2"/>
  <path d="M14 13 Q20 9 26 13" stroke="#d4a8ff" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <ellipse cx="20" cy="13" rx="6" ry="5" fill="#d4a8ff"/>
  <path d="M15 10 L14 6 L18 9 Z" fill="#d4a8ff"/>
  <path d="M25 10 L26 6 L22 9 Z" fill="#d4a8ff"/>
  <path d="M15.5 9.5 L14.8 7.2 L17.2 9 Z" fill="#ff9de2"/>
  <path d="M24.5 9.5 L25.2 7.2 L22.8 9 Z" fill="#ff9de2"/>
  <ellipse cx="17.5" cy="13" rx="1.5" ry="1.8" fill="#0a0a0d"/>
  <ellipse cx="22.5" cy="13" rx="1.5" ry="1.8" fill="#0a0a0d"/>
  <circle cx="18" cy="12.3" r="0.5" fill="white"/>
  <circle cx="23" cy="12.3" r="0.5" fill="white"/>
  <path d="M19.5 15 L20 15.5 L20.5 15 L20 14.5 Z" fill="#ff9de2"/>
  <path d="M13 23 Q11 22 12 20 Q14 19 15 21 Q16 19 18 20 Q18 22 16 23 Z" fill="#d4a8ff" opacity="0.7"/>
</svg>`;

/* ══════════════════════════════════════════
   SUGGESTIONS
══════════════════════════════════════════ */
const SUGGESTIONS = {
  fake: "Zaama c'est vrai que des inondations ont détruit Paris aujourd'hui ? https://breaking-news24.net/paris-floods-emergency",
  suspicious:
    "Zaama sahha que boire du jus de citron guérit le cancer en 2 semaines ? https://healthtruth-secrets.info/cancer-cure",
  verified:
    "NASA has released the deepest infrared image of the universe from the James Webb Space Telescope. https://www.nasa.gov/webbtelescope",
};

function loadSuggestion(type) {
  const input = document.getElementById("chatInput");
  input.value = SUGGESTIONS[type];
  autoResize(input);
  input.focus();
}

/* ══════════════════════════════════════════
   DETECT USER LANGUAGE
══════════════════════════════════════════ */
function detectLanguage(text) {
  const arabicPattern = /[\u0600-\u06FF]/;
  const frenchPattern = /[éèêëàâçîïôûùüÿœ]/i;
  const tunisianMarkers =
    /(zaama|shih|mouch|barcha|chnowa|andek|mtaa|hatha|hethi|wallah)/i;

  if (tunisianMarkers.test(text)) return "tun";
  if (arabicPattern.test(text)) return "ar";
  if (frenchPattern.test(text)) return "fr";
  return "en";
}

/* ══════════════════════════════════════════
   FILE HANDLING
══════════════════════════════════════════ */
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  pendingFile = file;
  pendingFileType = file.type.startsWith("video") ? "video" : "image";

  const bar = document.getElementById("filePreviewBar");
  const name = document.getElementById("filePreviewName");
  const previewImg = document.getElementById("filePreviewImg");

  name.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;

  // Show image preview if it's an image
  if (file.type.startsWith("image")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.style.display = "none";
  }

  bar.style.display = "flex";
}

function clearFile() {
  pendingFile = pendingFileType = pendingFileB64 = null;
  document.getElementById("filePreviewBar").style.display = "none";
  document.getElementById("fileInput").value = "";
  document.getElementById("filePreviewImg").style.display = "none";
}

/* ══════════════════════════════════════════
   INPUT HELPERS
══════════════════════════════════════════ */
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* ══════════════════════════════════════════
   CHAT UI HELPERS
══════════════════════════════════════════ */
function appendUserMsg(text, mediaData) {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg user";
  let inner = "";

  if (mediaData) {
    if (mediaData.type === "image") {
      inner += `<div class="user-img-preview"><img src="${mediaData.url}" alt="uploaded"/></div>`;
    } else if (mediaData.type === "video") {
      inner += `<div class="user-video-preview"><video controls src="${mediaData.url}" style="max-width: 200px; border-radius: 8px;"></video></div>`;
    }
  }

  if (text) {
    inner += `<div class="msg-bubble user-bubble">${escapeHtml(text)}</div>`;
  }

  msg.innerHTML = inner;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function appendTyping() {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg bot";
  msg.id = "typingMsg";
  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble typing"><span></span><span></span><span></span></div>
  `;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function removeTyping() {
  document.getElementById("typingMsg")?.remove();
}

/* ── Verdict texts in multiple languages ── */
function getVerdictText(verdict, confidence, lang) {
  const texts = {
    verified: {
      tun:
        confidence >= 75
          ? "✅ not fake bro — vérifié !"
          : "✅ mrgll mais reste vigilant",

      fr:
        confidence >= 75
          ? "✅ Vérifié — c'est vrai !"
          : "✅ Plutôt vrai — mais reste vigilant",
      en:
        confidence >= 75
          ? "✅ Verified — it's true!"
          : "✅ Likely true — but stay vigilant",
    },
    suspicious: {
      tun:
        confidence >= 60
          ? "⚠️ Zaama… méfie-toi bro"
          : "⚠️ yodhhorli katous f chkara hehe — suspect",

      fr: confidence >= 60 ? "⚠️ Zaama… méfie-toi" : "⚠️ Pas clair — suspect",
      en:
        confidence >= 60
          ? "⚠️ Suspicious… be careful"
          : "⚠️ Unclear — suspicious",
    },
    misleading: {
      tun: "🔴 Katous fil chkara belhak — Misleading !",

      fr: "🔴 Complètement trompeur — Fake news !",
      en: "🔴 Completely misleading — Fake news!",
    },
    unknown: {
      tun: "🤔 Ma3raftech — résultat inconnu",

      fr: "🤔 Je ne sais pas — résultat inconnu",
      en: "🤔 Unknown — can't determine",
    },
  };
  return texts[verdict]?.[lang] || texts[verdict]?.en || verdict;
}

function getAuthText(authVerdict, lang) {
  const texts = {
    authentic: {
      tun: "✅ Contenu authentique",

      fr: "✅ Contenu authentique",
      en: "✅ Authentic content",
    },
    likely_ai: {
      tun: "🤮 rod belek générée par IA",

      fr: "🤮 Probablement généré par IA",
      en: "🤮 Likely AI-generated",
    },
    manipulated: {
      tun: "✂️ Contenu manipulé",

      fr: "✂️ Contenu manipulé",
      en: "✂️ Manipulated content",
    },
  };
  return texts[authVerdict]?.[lang] || texts[authVerdict]?.en || authVerdict;
}

function getSourceText(sVerdict, lang) {
  const texts = {
    trusted: {
      tun: "✅ jawek behi Source fiable",

      fr: "✅ Source fiable",
      en: "✅ Trusted source",
    },
    suspicious: {
      tun: "⚠️ Source suspecte — watch out",

      fr: "⚠️ Source suspecte — méfie-toi",
      en: "⚠️ Suspicious source — beware",
    },
    unknown: {
      tun: "❓ Source inconnue",

      fr: "❓ Source inconnue",
      en: "❓ Unknown source",
    },
  };
  return texts[sVerdict]?.[lang] || texts[sVerdict]?.en || sVerdict;
}

function appendBotResult(data) {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg bot";

  const verdict = (data.verdict || "unknown").toLowerCase();
  const confidence = parseInt(data.confidence ?? 0);
  const authV = (data.authenticity_verdict || "").toLowerCase();
  const sVerdict = (data.source_verdict || "unknown").toLowerCase();
  const sScore = parseInt(data.source_score ?? 0);
  const authScore = parseInt(data.authenticity_score ?? 0);
  const lang = currentLanguage;

  const allFlags = [
    ...(data.authenticity_flags || []),
    ...(data.flags || []),
    ...(data.source_flags || []),
  ];

  const flagsHtml = allFlags.length
    ? `<div class="result-flags">${allFlags.map((f) => `<span class="flag-tag">${escapeHtml(f)}</span>`).join("")}</div>`
    : "";

  const uid = Date.now();
  // Build feature scoring HTML
const features = data.features || {};
const featureLabels = {
  factual_plausibility: "Plausibilité factuelle",
  sensationalism:       "Sensationnalisme",
  detail_precision:     "Précision des détails",
  internal_coherence:   "Cohérence interne",
  disinfo_pattern:      "Pattern désinformation",
};
const featureRowsHtml = Object.entries(featureLabels).map(([key, label]) => {
  const score = features[key]?.score ?? 0;
  const reason = features[key]?.reason ?? "";
  const color = score >= 70
    ? "var(--verified)"
    : score >= 40
    ? "var(--suspicious)"
    : "var(--misleading)";
  return `
    <div class="feature-row">
      <div class="feature-row-top">
        <span class="feature-label">${label}</span>
        <span class="feature-score">${score}/100</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${score}%; background:${color};"></div>
      </div>
      <span class="feature-reason">${escapeHtml(reason)}</span>
    </div>`;
}).join("");

  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble result-bubble ${verdict}">

      <div class="result-top">
        <span class="result-verdict">${getVerdictText(verdict, confidence, lang)}</span>
        <span class="result-score-badge">${confidence}%</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" id="bar-main-${uid}" data-score="${confidence}"></div>
      </div>
      <!-- Réponse Katous en tunisien -->
${data.katous_reply ? `
<div class="katous-reply">
  <span class="katous-icon">${BOT_AVATAR_SVG}</span>
  <p>${escapeHtml(data.katous_reply)}</p>
</div>` : ""}

<p class="result-expl">${escapeHtml(data.explanation || "—")}</p>

<!-- Feature Scoring -->
<details class="feature-details" open>
  <summary>🔬 Voir l'analyse détaillée (Feature Scoring)</summary>
  <div class="feature-scoring-block">
    ${featureRowsHtml}
  </div>
</details>

      ${flagsHtml}

      ${
        authV
          ? `
      <div class="axe-mini axe1-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 1 · Authenticité</span>
          <span class="axe-score">${authScore}%</span>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar axe1-bar" id="bar-axe1-${uid}" data-score="${authScore}"></div>
        </div>
        <span class="axe-verdict-text">${getAuthText(authV, lang)}</span>
        <p class="axe-expl">${escapeHtml(data.authenticity_explanation || "—")}</p>
      </div>`
          : ""
      }

      <div class="axe-mini axe3-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 3 · Crédibilité source</span>
          <span class="axe-score">${sScore}%</span>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar axe3-bar" id="bar-axe3-${uid}" data-score="${sScore}"></div>
        </div>
        <span class="source-badge ${sVerdict}">${getSourceText(sVerdict, lang)}</span>
        <p class="axe-expl">${escapeHtml(data.source_explanation || "—")}</p>
      </div>

      <button class="new-analysis-btn" onclick="resetChat()">← ${lang === "tun" ? "حلل حاجة أخرى" : lang === "ar" ? "حلل شيئًا آخر" : lang === "fr" ? "Analyser autre chose" : "Analyze something else"}</button>
    </div>
  `;

  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;

  setTimeout(() => {
    const setBar = (id, score) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      const color =
        score >= 70
          ? "var(--verified)"
          : score >= 40
            ? "var(--suspicious)"
            : "var(--misleading)";
      bar.style.width = score + "%";
      bar.style.background = color;
    };
    setBar(`bar-main-${uid}`, confidence);
    setBar(`bar-axe1-${uid}`, authScore);
    setBar(`bar-axe3-${uid}`, sScore);
  }, 100);
}

function appendBotError(text) {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg bot";
  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble error-bubble">⚠️ ${escapeHtml(text)}<br><small>Réessaie dans quelques secondes.</small></div>
  `;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function resetChat() {
  const input = document.getElementById("chatInput");
  input.value = "";
  autoResize(input);
  clearFile();
  const win = document.getElementById("chatWindow");
  win.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ══════════════════════════════════════════
   SYSTEM PROMPTS
══════════════════════════════════════════ */

const SYSTEM_EXTRACT = `You are a message parser. Extract the main content/claim, any caption or headline, and any URL from the user's message.
Respond ONLY with a valid JSON object, no preamble, no markdown:
{
  "content": "<the main text or claim to verify>",
  "caption": "<headline or caption if present, else empty string>",
  "url": "<URL if present, else empty string>"
}`;

const SYSTEM_AXE1 = `You are an expert in digital content authenticity and AI-generated content detection.
Analyze the provided content for signs of:
- AI-generated text (unnatural fluency, lack of specific details, generic phrasing)
- Image manipulation (inconsistent lighting, artifacts, cloning)
- Deepfake indicators (facial inconsistencies, unnatural features)
- Recycled content used in a misleading new context

Respond ONLY with a valid JSON object, no preamble, no markdown:
{
  "authenticity_verdict": "authentic" | "likely_ai" | "manipulated",
  "authenticity_score": <integer 0-100>,
  "authenticity_explanation": "<2-3 sentence analysis>",
  "authenticity_flags": ["<short flag>"]
}`;

const SYSTEM_AXE2 = `You are an expert fact-checker using Feature Scoring methodology.

Analyze the content and score EACH feature independently on 0-100:

FEATURE 1 - FACTUAL_PLAUSIBILITY
→ Is the claim factually possible based on known reality?
→ 0 = clearly impossible/false, 100 = well-established fact

FEATURE 2 - SENSATIONALISM  
→ Is the language exaggerated, emotionally charged, clickbait?
→ 0 = extremely sensationalist (red flag), 100 = neutral/factual tone

FEATURE 3 - DETAIL_PRECISION
→ Are there verifiable specifics (dates, names, numbers, locations)?
→ 0 = completely vague, 100 = rich verifiable details

FEATURE 4 - INTERNAL_COHERENCE
→ Does the claim contradict itself? Do all elements align?
→ 0 = contradictions detected, 100 = perfectly coherent

FEATURE 5 - DISINFO_PATTERN
→ Does it match known misinformation patterns (recycled content, out-of-context, conspiracy framing)?
→ 0 = classic disinfo pattern, 100 = no suspicious pattern

Respond ONLY with valid JSON, no preamble, no markdown:
{
  "features": {
    "factual_plausibility":  { "score": <0-100>, "reason": "<one sentence>" },
    "sensationalism":        { "score": <0-100>, "reason": "<one sentence>" },
    "detail_precision":      { "score": <0-100>, "reason": "<one sentence>" },
    "internal_coherence":    { "score": <0-100>, "reason": "<one sentence>" },
    "disinfo_pattern":       { "score": <0-100>, "reason": "<one sentence>" }
  },
  "verdict": "verified" | "suspicious" | "misleading",
  "confidence": <weighted average 0-100>,
  "explanation": "<2-3 sentence global analysis>",
  "flags": ["<short flag>"]
}`;

const SYSTEM_TUNISIAN_RESPONSE = `You are "Katous", a funny and sharp Tunisian fact-checker chatbot.
You speak in authentic Tunisian dialect (Derja).
Given a JSON analysis result, write a SHORT conversational response in Tunisian dialect.

Rules:
- 2-3 sentences max
- Natural Tunisian dialect (mix Arabic/French like Tunisians actually speak)
- Use "zaama", "bro", "barcha", "mriguel", "sahha", "mouch sahha", "mtekkd" naturally
- Match the verdict: serious if misleading, reassuring if verified, cautious if suspicious
- Do NOT repeat all the scores — just give the vibe in a human way
- End with a short emoji

Respond ONLY with a plain text string (no JSON, no markdown).`;


const SYSTEM_AXE3 = `You are an expert in source credibility analysis.
Analyze the source URL for trustworthiness. Look for suspicious domains, clickbait patterns, spoofed sites, new domains.
Respond ONLY with a valid JSON object, no preamble, no markdown:
{
  "source_verdict": "trusted" | "suspicious" | "unknown",
  "source_score": <integer 0-100>,
  "source_explanation": "<1-2 sentence analysis>",
  "source_flags": ["<short flag>"]
}`;

/* ══════════════════════════════════════════
   API HELPER
══════════════════════════════════════════ */
async function callAPI(systemPrompt, userContent) {
  const res = await fetch("http://localhost:3000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userContent }),
  });
  if (!res.ok) throw new Error("Erreur serveur " + res.status);
  const data = await res.json();
  const raw = (data.result || "{}").replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // plain text (e.g. Katous response)
  }
}

/* ══════════════════════════════════════════
   FILE UTILITIES
══════════════════════════════════════════ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

function videoFrame(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    });
    video.addEventListener("seeked", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video error"));
    });
  });
}

/* ══════════════════════════════════════════
   MAIN SEND FUNCTION
══════════════════════════════════════════ */
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const text = input.value.trim();

  if (!text && !pendingFile) return;

  // Detect language from user's message
  if (text) {
    currentLanguage = detectLanguage(text);
  }

  // Show user message with media preview
  let mediaData = null;
  if (pendingFile && pendingFileType === "image") {
    mediaData = { type: "image", url: URL.createObjectURL(pendingFile) };
  } else if (pendingFile && pendingFileType === "video") {
    mediaData = { type: "video", url: URL.createObjectURL(pendingFile) };
  }
  appendUserMsg(text, mediaData);

  // Reset input
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  const localFile = pendingFile;
  const localFileType = pendingFileType;
  clearFile();

  appendTyping();

  try {
    // Step 1: Extract content/caption/URL from message
    let extractedContent = text;
    let extractedCaption = "";
    let extractedUrl = "";

    if (text) {
      try {
        const ex = await callAPI(SYSTEM_EXTRACT, [{ type: "text", text }]);
        extractedContent = ex.content || text;
        extractedCaption = ex.caption || "";
        extractedUrl = ex.url || "";
      } catch {
        // fallback
      }
    }

    // Step 2: Fetch URL content if present
    let scrapedData = null;
    if (extractedUrl) {
      try {
        const fetchRes = await fetch("http://localhost:3000/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: extractedUrl }),
        });
        if (fetchRes.ok) {
          scrapedData = await fetchRes.json();
          if (!extractedCaption && scrapedData.title) {
            extractedCaption = scrapedData.title;
          }
        }
      } catch {
        // non-blocking
      }
    }

    // Step 3: Build userContent with full context (source + content + caption)
    let userContentMain = [];
    let contentText = "";

    if (scrapedData) {
      contentText = `Title: ${scrapedData.title || ""}\nDescription: ${scrapedData.description || ""}\nBody: ${scrapedData.bodyText || ""}\nUser caption: ${extractedCaption || ""}\nUser claim: ${extractedContent || ""}`;
    } else {
      contentText = `Content: ${extractedContent}\nCaption: ${extractedCaption || ""}`;
    }

    if (localFile) {
      const mediaType = localFile.type || "image/jpeg";
      let b64;
      if (localFileType === "video") {
        b64 = await videoFrame(localFile);
        userContentMain.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: b64 },
        });
      } else {
        b64 = await fileToBase64(localFile);
        userContentMain.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: b64 },
        });
      }
      userContentMain.push({ type: "text", text: contentText });
    } else {
      userContentMain.push({ type: "text", text: contentText });
    }

    // Axe3 content
    const userContentAxe3 = [
      {
        type: "text",
        text: extractedUrl
          ? `Analyze this source URL for credibility:\n${extractedUrl}\nContext: "${extractedCaption || extractedContent}"\nReturn only the JSON verdict.`
          : `No URL. Analyze credibility of this claim: "${extractedContent}"\nReturn only the JSON verdict.`,
      },
    ];

    // Step 4: 3 parallel AI calls
    const [result1, result2, result3] = await Promise.all([
      callAPI(SYSTEM_AXE1, userContentMain),
      callAPI(SYSTEM_AXE2, userContentMain),
      callAPI(SYSTEM_AXE3, userContentAxe3),
    ]);

    // Step 5: Combined score
    // Step 5: Feature Scoring — weighted average from Axe2 features
const f = result2.features || {};
const featureWeights = {
  factual_plausibility: 0.35,
  sensationalism:       0.15,
  detail_precision:     0.20,
  internal_coherence:   0.15,
  disinfo_pattern:      0.15,
};
const axe2WeightedScore = Object.entries(featureWeights).reduce(
  (acc, [key, weight]) => acc + (f[key]?.score ?? 50) * weight,
  0
);

const combinedScore = Math.round(
  (result1.authenticity_score ?? 50) * 0.20 +
  axe2WeightedScore                  * 0.50 +
  (result3.source_score ?? 50)       * 0.30,
);

// Generate Tunisian response from combined result
const summaryForKatous = `
Verdict: ${result2.verdict}, confidence: ${combinedScore}%
Factual plausibility: ${f.factual_plausibility?.score ?? "?"}
Sensationalism: ${f.sensationalism?.score ?? "?"}
Detail precision: ${f.detail_precision?.score ?? "?"}
Internal coherence: ${f.internal_coherence?.score ?? "?"}
Disinfo pattern: ${f.disinfo_pattern?.score ?? "?"}
Source verdict: ${result3.source_verdict}
Explanation: ${result2.explanation}
`;

let katousReply = "";
try {
  const katousRes = await callAPI(SYSTEM_TUNISIAN_RESPONSE, [
    { type: "text", text: summaryForKatous }
  ]);
  // callAPI tries to JSON.parse — Katous returns plain text so we handle it
  katousReply = typeof katousRes === "string"
    ? katousRes
    : katousRes?.message || katousRes?.reply || result2.explanation;
} catch {
  katousReply = result2.explanation; // fallback
}

    removeTyping();
    appendBotResult({
  authenticity_verdict: result1.authenticity_verdict,
  authenticity_score: result1.authenticity_score,
  authenticity_explanation: result1.authenticity_explanation,
  authenticity_flags: result1.authenticity_flags,
  verdict: result2.verdict,
  confidence: combinedScore,
  explanation: result2.explanation,
  flags: result2.flags,
  features: result2.features,        // ← AJOUTE ÇA
  katous_reply: katousReply,          // ← AJOUTE ÇA
  source_verdict: result3.source_verdict,
  source_score: result3.source_score,
  source_explanation: result3.source_explanation,
  source_flags: result3.source_flags,
});
  } catch (err) {
    removeTyping();
    appendBotError(err.message);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

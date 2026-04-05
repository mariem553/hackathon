/* ══════════════════════════════════════════
   قطوس في شكارة — App.js
   ✅ 5-step pipeline with progress indicator
   ✅ ML pre-score (TF-IDF) + LLM hybrid
   ✅ ML×40% + LLM×60% weighted per axis
   ✅ Full multimodal: text + image(s) + video + URL + caption
══════════════════════════════════════════ */

/* ─── State ─── */
let pendingFiles = [];
let urlInputVisible = false;
let captionInputVisible = false;

/* ══════════════════════════════════════════
   BOT AVATAR SVG
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

const SUGGESTIONS = {
  fake: "Is it true that massive floods destroyed Paris today? https://breaking-news24.net/paris-floods-emergency",
  suspicious:
    "Drinking lemon juice cures cancer in 2 weeks — is this real? https://healthtruth-secrets.info/cancer-cure",
  verified:
    "NASA released the deepest infrared image of the universe from the James Webb Space Telescope. https://www.nasa.gov/webbtelescope",
};
function loadSuggestion(type) {
  const input = document.getElementById("chatInput");
  input.value = SUGGESTIONS[type];
  autoResize(input);
  input.focus();
}

/* ══════════════════════════════════════════
   TOGGLE EXTRA INPUT ROWS
══════════════════════════════════════════ */
function toggleUrlInput() {
  urlInputVisible = !urlInputVisible;
  document.getElementById("urlInputRow").style.display = urlInputVisible
    ? "flex"
    : "none";
  document
    .getElementById("urlToggleBtn")
    .classList.toggle("active", urlInputVisible);
  if (urlInputVisible) document.getElementById("urlInput").focus();
}

function toggleCaptionInput() {
  captionInputVisible = !captionInputVisible;
  document.getElementById("captionInputRow").style.display = captionInputVisible
    ? "flex"
    : "none";
  document
    .getElementById("captionToggleBtn")
    .classList.toggle("active", captionInputVisible);
  if (captionInputVisible) document.getElementById("captionInput").focus();
}

/* ══════════════════════════════════════════
   FILE HANDLING
══════════════════════════════════════════ */
function handleFile(e) {
  Array.from(e.target.files).forEach((file) => {
    pendingFiles.push({
      file,
      type: file.type.startsWith("video") ? "video" : "image",
      previewUrl: URL.createObjectURL(file),
    });
  });
  renderAttachedItems();
  e.target.value = "";
}

function removeAttachedItem(index) {
  URL.revokeObjectURL(pendingFiles[index]?.previewUrl);
  pendingFiles.splice(index, 1);
  renderAttachedItems();
}

function renderAttachedItems() {
  const bar = document.getElementById("attachedItemsBar");
  const list = document.getElementById("attachedItemsList");
  if (pendingFiles.length === 0) {
    bar.style.display = "none";
    list.innerHTML = "";
    return;
  }
  bar.style.display = "flex";
  list.innerHTML = pendingFiles
    .map(
      (item, i) => `
    <div class="attached-item">
      ${
        item.type === "image"
          ? `<img src="${item.previewUrl}" class="attached-thumb" alt="preview"/>`
          : `<div class="attached-video-icon">▶</div>`
      }
      <span class="attached-name">${item.file.name.length > 18 ? item.file.name.slice(0, 16) + "…" : item.file.name}</span>
      <button class="attached-remove" onclick="removeAttachedItem(${i})">×</button>
    </div>
  `,
    )
    .join("");
}

function clearFile() {
  pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  pendingFiles = [];
  renderAttachedItems();
  const fileInput = document.getElementById("fileInput");
  if (fileInput) fileInput.value = "";
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
   LANGUAGE DETECTION
══════════════════════════════════════════ */
function detectLang(text) {
  if (!text || text.trim().length < 3) return "English";
  if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
  if (
    /\b(le|la|les|un|une|des|est|sont|que|qui|pour|dans|avec|sur|pas|plus|très|aussi|mais|zaama|wella|mish)\b/i.test(
      text,
    )
  )
    return "French";
  return "English";
}

/* ══════════════════════════════════════════
   PROGRESS INDICATOR
══════════════════════════════════════════ */
const STEPS = [
  "[1/5] Extracting content signals…",
  "[2/5] Fetching URL content…",
  "[3/5] Running ML pre-score (TF-IDF)…",
  "[4/5] Running 3-axis AI analysis…",
  "[5/5] Computing combined score…",
];

function updateTypingStep(stepIndex) {
  const el = document.getElementById("typingStepText");
  if (el) el.textContent = STEPS[stepIndex] || "";
}

/* ══════════════════════════════════════════
   CHAT UI HELPERS
══════════════════════════════════════════ */
function appendUserMsg(text, previews) {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg user";
  let inner = "";
  if (previews?.length) {
    inner += `<div class="user-media-row">`;
    previews.forEach((p) => {
      inner +=
        p.type === "image"
          ? `<div class="user-img-preview"><img src="${p.previewUrl}" alt="uploaded"/></div>`
          : `<div class="user-img-preview user-video-preview"><span>📹</span><small>${p.file.name}</small></div>`;
    });
    inner += `</div>`;
  }
  if (text)
    inner += `<div class="msg-bubble user-bubble">${escapeHtml(text)}</div>`;
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
    <div class="msg-bubble" style="display:flex;flex-direction:column;gap:8px;">
      <div class="typing"><span></span><span></span><span></span></div>
      <span id="typingStepText" style="font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:0.03em;">${STEPS[0]}</span>
    </div>
  `;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}
function removeTyping() {
  document.getElementById("typingMsg")?.remove();
}

/* ── Verdict labels ── */
function verdictLabel(verdict, confidence) {
  if (verdict === "verified")
    return confidence >= 75 ? "✅ Verified" : "✅ Likely true — stay vigilant";
  if (verdict === "suspicious")
    return confidence >= 60 ? "⚠️ Suspicious" : "⚠️ Unclear — be careful";
  if (verdict === "misleading") return "🔴 Misleading — قطوس في شكارة!";
  return "🤔 Unknown result";
}
function authLabel(v) {
  if (v === "authentic") return "✅ Authentic content";
  if (v === "likely_ai") return "🤖 Likely AI-generated";
  if (v === "manipulated") return "✂️ Manipulated content";
  return "❓ Authenticity unknown";
}
function sourceLabel(v) {
  if (v === "trusted") return "✅ Trusted source";
  if (v === "suspicious") return "⚠️ Suspicious source";
  return "❓ Unknown source";
}

/* ══════════════════════════════════════════
   APPEND RESULT BUBBLE
══════════════════════════════════════════ */
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

  const allFlags = [
    ...(data.authenticity_flags || []),
    ...(data.flags || []),
    ...(data.source_flags || []),
    ...(data.ml_flags || []),
  ];
  const flagsHtml = allFlags.length
    ? `<div class="result-flags">${allFlags.map((f) => `<span class="flag-tag">${f}</span>`).join("")}</div>`
    : "";

  // ML badge shown only when ML was available
  const mlBadge = data.ml_score_text
    ? `<div class="ml-badge">🤖 ML pre-score: <strong>${data.ml_score_text}</strong></div>`
    : "";

  const uid = Date.now();

  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble result-bubble ${verdict}">

      ${mlBadge}

      <div class="result-top">
        <span class="result-verdict">${verdictLabel(verdict, confidence)}</span>
        <span class="result-score-badge">${confidence}%</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" id="bar-main-${uid}"></div>
      </div>
      <p class="result-expl">${data.explanation || "—"}</p>

      ${flagsHtml}

      ${
        authV
          ? `
      <div class="axe-mini axe1-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 1 · Authenticity</span>
          <span class="axe-score">${authScore}%</span>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar axe1-bar" id="bar-axe1-${uid}"></div>
        </div>
        <span class="axe-verdict-text">${authLabel(authV)}</span>
        <p class="axe-expl">${data.authenticity_explanation || "—"}</p>
      </div>`
          : ""
      }

      <div class="axe-mini axe3-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 3 · Source credibility</span>
          <span class="axe-score">${sScore}%</span>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar axe3-bar" id="bar-axe3-${uid}"></div>
        </div>
        <span class="source-badge ${sVerdict}">${sourceLabel(sVerdict)}</span>
        <p class="axe-expl">${data.source_explanation || "—"}</p>
      </div>

      <button class="new-analysis-btn" onclick="resetChat()">← Analyze something else</button>
    </div>
  `;

  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;

  setTimeout(() => {
    const setBar = (id, score) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      bar.style.width = score + "%";
      bar.style.background =
        score >= 70
          ? "var(--verified)"
          : score >= 40
            ? "var(--suspicious)"
            : "var(--misleading)";
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
    <div class="msg-bubble error-bubble">
      ⚠️ ${escapeHtml(text)}<br><small>Try again in a few seconds.</small>
    </div>
  `;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function resetChat() {
  document.getElementById("chatInput").value = "";
  autoResize(document.getElementById("chatInput"));
  pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  pendingFiles = [];
  renderAttachedItems();
  document.getElementById("urlInput").value = "";
  document.getElementById("captionInput").value = "";
  if (urlInputVisible) toggleUrlInput();
  if (captionInputVisible) toggleCaptionInput();
  document
    .getElementById("chatWindow")
    .scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ══════════════════════════════════════════
   SYSTEM PROMPTS — Chain-of-Thought style
   Language injected dynamically per request
══════════════════════════════════════════ */
const SYSTEM_EXTRACT = `You are a message parser. Extract the main content/claim, any caption or headline, and any URL from the user's message.
Respond ONLY with a valid JSON object, no preamble, no markdown:
{"content":"<main text to verify>","caption":"<headline if present else empty>","url":"<URL if present else empty>"}`;

function buildAxe1Prompt(lang, mlContext, ragContext) {
  return `You are an expert in digital content authenticity and AI-generated content detection.

Analyze the content step by step:
1. Does it show signs of AI-generated text? (unnatural fluency, generic phrasing, lack of specific details)
2. Are there image/video manipulation indicators? (inconsistencies, artifacts)
3. Is this recycled content used in a misleading new context?
4. Conclusion with confidence score.

${mlContext ? `[ML PRE-SCORE context]: ${mlContext}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
IMPORTANT: Respond in ${lang}. Keep explanations concise (2-3 sentences).
Respond ONLY with valid JSON, no preamble, no markdown:
{"authenticity_verdict":"authentic"|"likely_ai"|"manipulated","authenticity_score":<0-100>,"authenticity_explanation":"<2-3 sentences in ${lang}>","authenticity_flags":["<flag>"]}`;
}

function buildAxe2Prompt(lang, mlContext, ragContext) {
  return `You are an expert fact-checker and contextual consistency analyst.

Analyze step by step:
1. What specific claims does this content make?
2. Are there internal contradictions or logical inconsistencies?
3. Does the caption/headline match the actual content?
4. Is the content being used in a misleading context?
5. Final verdict with confidence.

${mlContext ? `[ML PRE-SCORE context]: ${mlContext}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
IMPORTANT: Respond in ${lang}. Keep explanations concise.
Respond ONLY with valid JSON, no preamble, no markdown:
{"verdict":"verified"|"suspicious"|"misleading","confidence":<0-100>,"explanation":"<2-4 sentences in ${lang}>","flags":["<flag>"]}`;
}

function buildAxe3Prompt(lang, mlFeatures, ragContext) {
  const domainInfo = mlFeatures
    ? `ML heuristic source score: ${mlFeatures.source_score}/100 (${mlFeatures.source_verdict}). Domain flags: ${(mlFeatures.combined_flags || []).join(", ")}.`
    : "";

  return `You are an expert in source credibility analysis.

Analyze the source step by step:
1. Is the domain known and reputable?
2. Are there suspicious URL patterns, clickbait indicators, or spoofing signs?
3. Does the writing style suggest a credible source?
4. Final credibility verdict.

${domainInfo ? `[ML heuristic pre-analysis]: ${domainInfo}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
IMPORTANT: Respond in ${lang}. Keep explanations concise.
Respond ONLY with valid JSON, no preamble, no markdown:
{"source_verdict":"trusted"|"suspicious"|"unknown","source_score":<0-100>,"source_explanation":"<1-2 sentences in ${lang}>","source_flags":["<flag>"]}`;
}

/* ══════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════ */
async function callAPI(systemPrompt, userContent) {
  const res = await fetch("http://localhost:3000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userContent }),
  });
  if (!res.ok) throw new Error("Server error " + res.status);
  const data = await res.json();
  const raw = (data.result || "{}").replace(/```json|```/gi, "").trim();
  return JSON.parse(raw);
}

async function callMLPrescore(text, url) {
  try {
    const res = await fetch("http://localhost:3000/ml/prescore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || "", url: url || "" }),
    });
    if (!res.ok) return null;
    return await res.json(); // { mlPredict, mlFeatures }
  } catch {
    return null; // ML offline → graceful degradation
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
   WEIGHTED SCORE COMBINER
   ML×40% + LLM×60% per axis
   Then: Axe1×20% + Axe2×50% + Axe3×30%
══════════════════════════════════════════ */
function combineScores(mlScore, llmScore, mlWeight = 0.4) {
  if (mlScore === null || mlScore === undefined) return llmScore;
  return Math.round(mlScore * mlWeight + llmScore * (1 - mlWeight));
}

/* ══════════════════════════════════════════
   MAIN SEND FUNCTION — 5 steps
══════════════════════════════════════════ */
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const text = input.value.trim();
  const manualUrl = document.getElementById("urlInput").value.trim();
  const manualCaption = document.getElementById("captionInput").value.trim();

  if (!text && pendingFiles.length === 0 && !manualUrl) return;

  const lang = detectLang(text || manualCaption);
  const previewsSnapshot = [...pendingFiles];
  appendUserMsg(text, previewsSnapshot);

  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  const localFiles = [...pendingFiles];
  pendingFiles = [];
  renderAttachedItems();
  if (manualUrl) document.getElementById("urlInput").value = "";
  if (manualCaption) document.getElementById("captionInput").value = "";

  appendTyping();

  try {
    /* ── STEP 1: Extract content/caption/URL ── */
    updateTypingStep(0);
    let extractedContent = text;
    let extractedCaption = manualCaption;
    let extractedUrl = manualUrl;

    if (text && !manualUrl) {
      try {
        const ex = await callAPI(SYSTEM_EXTRACT, [{ type: "text", text }]);
        extractedContent = ex.content || text;
        if (!extractedCaption) extractedCaption = ex.caption || "";
        if (!extractedUrl) extractedUrl = ex.url || "";
      } catch {
        /* fallback */
      }
    }

    /* ── STEP 2: Fetch URL content ── */
    updateTypingStep(1);
    let scrapedContent = "";
    if (extractedUrl) {
      try {
        const fetchRes = await fetch("http://localhost:3000/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: extractedUrl }),
        });
        if (fetchRes.ok) {
          const scraped = await fetchRes.json();
          scrapedContent = [
            scraped.ogTitle || scraped.title,
            scraped.ogDesc || scraped.description,
            scraped.bodyText,
          ]
            .filter(Boolean)
            .join("\n\n");
          if (!extractedCaption && (scraped.ogTitle || scraped.title))
            extractedCaption = scraped.ogTitle || scraped.title;
        }
      } catch {
        /* non-blocking */
      }
    }

    /* ── STEP 3: ML pre-score (TF-IDF + heuristics) ── */
    updateTypingStep(2);
    const textForML = scrapedContent || extractedContent || "";
    const mlResult = await callMLPrescore(textForML, extractedUrl);

    const mlPredict = mlResult?.mlPredict || null; // TF-IDF result
    const mlFeatures = mlResult?.mlFeatures || null; // heuristic source score

    // Build ML context string to inject into prompts
    let mlContextText = null;
    if (mlPredict) {
      mlContextText =
        `TF-IDF classifier: fake_probability=${(mlPredict.fake_probability * 100).toFixed(0)}%, ` +
        `real_probability=${(mlPredict.real_probability * 100).toFixed(0)}%, ` +
        `verdict=${mlPredict.ml_verdict} (${mlPredict.confidence_label} confidence). ` +
        `Linguistic signals — clickbait_count:${mlPredict.clickbait_count}, ` +
        `caps_ratio:${(mlPredict.caps_ratio * 100).toFixed(0)}%, ` +
        `lexical_diversity:${mlPredict.lexical_diversity}. ` +
        (mlPredict.flags?.length
          ? `ML flags: ${mlPredict.flags.join(", ")}.`
          : "");
    }

    /* ── STEP 3B: RAG Search (Retrieval-Augmented Generation) ── */
    let ragContext = "";
    let contextualGapScore = 0;
    let ragQuickFlags = [];
    try {
      const ragRes = await fetch("http://localhost:3000/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textForML || extractedContent,
          url: extractedUrl,
          caption: extractedCaption,
        }),
      });
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        ragContext = ragData.ragContext || "";
        contextualGapScore = ragData.contextualGapScore || 0;
        ragQuickFlags = ragData.quickFlagsResult?.flags || [];

        // Add gap score to ML context
        if (contextualGapScore > 50) {
          mlContextText += `\n[RAG contextual-gap-score]: ${contextualGapScore} (caption-content mismatch detected).`;
        }
        // Add quick flags
        if (ragQuickFlags.length > 0) {
          mlContextText += `\n[RAG detected flags]: ${ragQuickFlags.join(", ")}.`;
        }
      }
    } catch {
      /* non-blocking — RAG failure doesn't block analysis */
    }

    /* ── STEP 4: 3-axis AI analysis (parallel) ── */
    updateTypingStep(3);

    // Build media blocks
    let userContentMain = [];
    for (const item of localFiles) {
      const b64 =
        item.type === "video"
          ? await videoFrame(item.file)
          : await fileToBase64(item.file);
      const mediaType =
        item.type === "video" ? "image/jpeg" : item.file.type || "image/jpeg";
      userContentMain.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: b64 },
      });
    }

    // Build text context block
    const contentForAnalysis =
      scrapedContent || extractedContent || "(no text provided)";
    const contextParts = [];
    if (extractedCaption)
      contextParts.push(`Caption/Headline: "${extractedCaption}"`);
    if (extractedUrl) contextParts.push(`Source URL: ${extractedUrl}`);
    contextParts.push(`Content:\n${contentForAnalysis}`);
    if (localFiles.length > 0)
      contextParts.push(
        `Attached media: ${localFiles.map((f) => f.file.name).join(", ")}`,
      );

    userContentMain.push({
      type: "text",
      text:
        contextParts.join("\n\n") + "\n\nReturn only the JSON verdict object.",
    });

    const userContentAxe3 = [
      {
        type: "text",
        text: extractedUrl
          ? `Analyze source credibility for: ${extractedUrl}\nContext: "${extractedCaption || extractedContent}"\nReturn only the JSON verdict.`
          : `No URL. Analyze credibility of claim: "${extractedContent}"\nReturn only the JSON verdict.`,
      },
    ];

    const [result1, result2, result3] = await Promise.all([
      callAPI(
        buildAxe1Prompt(lang, mlContextText, ragContext),
        userContentMain,
      ),
      callAPI(
        buildAxe2Prompt(lang, mlContextText, ragContext),
        userContentMain,
      ),
      callAPI(buildAxe3Prompt(lang, mlFeatures, ragContext), userContentAxe3),
    ]);

    /* ── STEP 5: Compute combined score ── */
    updateTypingStep(4);

    // Per-axis: ML×40% + LLM×60%
    const mlAuth = mlPredict ? mlPredict.ml_score : null; // 0-100
    const mlSrcScore = mlFeatures ? mlFeatures.source_score : null; // 0-100

    const axe1Combined = combineScores(
      mlAuth,
      result1.authenticity_score ?? 50,
      0.4,
    );
    const axe2Score = result2.confidence ?? 50; // no ML equivalent for consistency
    const axe3Combined = combineScores(
      mlSrcScore,
      result3.source_score ?? 50,
      0.4,
    );

    // Global: Axe1×20% + Axe2×50% + Axe3×30%
    const combinedScore = Math.round(
      axe1Combined * 0.2 + axe2Score * 0.5 + axe3Combined * 0.3,
    );

    // ML badge text
    let mlScoreText = null;
    if (mlPredict) {
      mlScoreText = `${mlPredict.ml_verdict} (${(mlPredict.real_probability * 100).toFixed(0)}% authentic) via TF-IDF`;
    }

    removeTyping();
    appendBotResult({
      authenticity_verdict: result1.authenticity_verdict,
      authenticity_score: axe1Combined,
      authenticity_explanation: result1.authenticity_explanation,
      authenticity_flags: result1.authenticity_flags,
      verdict: result2.verdict,
      confidence: combinedScore,
      explanation: result2.explanation,
      flags: result2.flags,
      source_verdict: result3.source_verdict,
      source_score: axe3Combined,
      source_explanation: result3.source_explanation,
      source_flags: result3.source_flags,
      ml_flags: mlPredict?.flags || [],
      ml_score_text: mlScoreText,
    });
  } catch (err) {
    removeTyping();
    appendBotError(err.message);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/* ══════════════════════════════════════════
   قطوس في شكارة — App.js (Chatbot)
   ✅ FULLY EXPLAINABLE AI:
   - ELA heatmap shown for images
   - RAG similar cases shown to user
   - ML top trigger words highlighted
   - CoT reasoning steps displayed
   - Score breakdown per axis visible
   ✅ 5-step pipeline with progress
   ✅ ML×40% + LLM×60% per axis
   ✅ Axe1×20% + Axe2×50% + Axe3×30%
   ✅ Dialecte tunisien
══════════════════════════════════════════ */

/* ─── State ─── */
let pendingFiles = [];
let urlInputVisible = false;
let captionInputVisible = false;

/* ══════════════════════════════════════════
   BOT AVATAR SVG
══════════════════════════════════════════ */
const BOT_AVATAR_SVG = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
   EXTRA INPUT TOGGLES
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
    </div>`,
    )
    .join("");
}

function clearFile() {
  pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  pendingFiles = [];
  renderAttachedItems();
  const fi = document.getElementById("fileInput");
  if (fi) fi.value = "";
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
    /\b(le|la|les|un|une|des|est|sont|que|qui|pour|dans|avec|sur|pas|plus|très|aussi|mais|zaama|wella|mish|sahha)\b/i.test(
      text,
    )
  )
    return "French";
  return "English";
}

/* ══════════════════════════════════════════
   PROGRESS STEPS
══════════════════════════════════════════ */
const STEPS = [
  "[1/5] Extraction des signaux…",
  "[2/5] Fetch URL content…",
  "[3/5] ML pre-score TF-IDF…",
  "[4/5] RAG similarity search…",
  "[5/5] 3-axis AI analysis…",
];

function updateTypingStep(stepIndex) {
  const el = document.getElementById("typingStepText");
  if (el) el.textContent = STEPS[stepIndex] || "";
}

/* ══════════════════════════════════════════
   EXPLAINABILITY HELPERS
══════════════════════════════════════════ */

const CLICKBAIT_WORDS = [
  "shocking",
  "exposed",
  "secret",
  "conspiracy",
  "doctors don't want",
  "you won't believe",
  "mainstream media",
  "doctors hate",
  "government hiding",
  "share before",
  "deleted",
  "suppressed",
  "banned",
  "miracle",
  "cure",
  "urgent",
  "breaking",
  "exclusive",
  "truth revealed",
  "wake up",
  "deep state",
  "new world order",
  "elite",
  "cabal",
  "zaama",
  "urgent",
];

function highlightSuspiciousWords(text) {
  if (!text) return "";
  let result = escapeHtml(text);
  CLICKBAIT_WORDS.forEach((word) => {
    const regex = new RegExp(`(${word})`, "gi");
    result = result.replace(regex, `<mark class="suspicious-word">$1</mark>`);
  });
  return result;
}

function buildRagHtml(ragData) {
  if (!ragData || !ragData.similarCases || ragData.similarCases.length === 0)
    return "";

  const icons = { verified: "✅", suspicious: "⚠️", misleading: "🔴" };
  const cases = ragData.similarCases
    .map(
      (c) => `
    <div class="rag-item rag-${c.verdict}">
      <div class="rag-item-header">
        <span class="rag-icon">${icons[c.verdict] || "❓"}</span>
        <span class="rag-caption">${escapeHtml(c.caption || c.content.slice(0, 80))}</span>
        <span class="rag-sim">${Math.round(c.similarity * 100)}% sim</span>
      </div>
      <p class="rag-expl">${escapeHtml(c.explanation || "")}</p>
    </div>`,
    )
    .join("");

  const gapScore = ragData.contextualGapScore || 0;
  const gapColor =
    gapScore > 75
      ? "var(--misleading)"
      : gapScore > 50
        ? "var(--suspicious)"
        : "var(--verified)";

  return `
    <div class="rag-block">
      <div class="rag-header">
        <span class="rag-title">🔍 RAG — ${ragData.numSimilarCases} cas similaires trouvés</span>
        <span class="rag-gap" style="color:${gapColor}">Gap caption/contenu: ${gapScore}%</span>
      </div>
      ${cases}
    </div>`;
}

function buildMlHtml(mlPredict, mlFeatures) {
  if (!mlPredict && !mlFeatures) return "";

  let html = `<div class="ml-explain-block">
    <div class="axe-mini-header"><span class="axe-label">🤖 ML Explainability (TF-IDF)</span></div>`;

  if (mlPredict) {
    const fakeP = Math.round(mlPredict.fake_probability * 100);
    const realP = Math.round(mlPredict.real_probability * 100);
    const barColor =
      fakeP > 65
        ? "var(--misleading)"
        : fakeP > 45
          ? "var(--suspicious)"
          : "var(--verified)";

    html += `
      <div class="ml-prob-row">
        <span class="ml-prob-label">Fake probability</span>
        <div class="ml-prob-bar-wrap"><div class="ml-prob-bar" style="width:${fakeP}%;background:${barColor}"></div></div>
        <span class="ml-prob-val" style="color:${barColor}">${fakeP}%</span>
      </div>
      <div class="ml-prob-row">
        <span class="ml-prob-label">Real probability</span>
        <div class="ml-prob-bar-wrap"><div class="ml-prob-bar" style="width:${realP}%;background:var(--verified)"></div></div>
        <span class="ml-prob-val" style="color:var(--verified)">${realP}%</span>
      </div>`;

    if (mlPredict.flags && mlPredict.flags.length > 0) {
      html += `<div class="ml-flags-row">${mlPredict.flags.map((f) => `<span class="flag-tag">${f}</span>`).join("")}</div>`;
    }
  }

  if (mlFeatures) {
    const srcColor =
      mlFeatures.source_verdict === "trusted"
        ? "var(--verified)"
        : "var(--misleading)";
    html += `
      <div class="ml-prob-row" style="margin-top:6px">
        <span class="ml-prob-label">Source score</span>
        <div class="ml-prob-bar-wrap"><div class="ml-prob-bar" style="width:${mlFeatures.source_score}%;background:${srcColor}"></div></div>
        <span class="ml-prob-val" style="color:${srcColor}">${mlFeatures.source_score}%</span>
      </div>`;
    if (mlFeatures.combined_flags && mlFeatures.combined_flags.length > 0) {
      html += `<div class="ml-flags-row">${mlFeatures.combined_flags.map((f) => `<span class="flag-tag">${f}</span>`).join("")}</div>`;
    }
  }

  html += `</div>`;
  return html;
}

function buildScoreBreakdown(axe1, axe2, axe3, combined) {
  const axes = [
    { label: "Axe 1 · Vérité du contenu (×20%)", score: axe1, weight: 20 },
    {
      label: "Axe 2 · Consistance caption/image (×50%)",
      score: axe2,
      weight: 50,
    },
    { label: "Axe 3 · Crédibilité source (×30%)", score: axe3, weight: 30 },
  ];

  const rows = axes
    .map((a) => {
      const color =
        a.score >= 70
          ? "var(--verified)"
          : a.score >= 40
            ? "var(--suspicious)"
            : "var(--misleading)";
      return `<div class="breakdown-row">
      <span class="breakdown-label">${a.label}</span>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${a.score}%;background:${color}"></div></div>
      <span class="breakdown-val">${a.score}%</span>
    </div>`;
    })
    .join("");

  return `<div class="score-breakdown">
    ${rows}
    <div class="breakdown-formula">Score combiné = ${axe1}×0.2 + ${axe2}×0.5 + ${axe3}×0.3 = <strong style="color:var(--accent)">${combined}%</strong></div>
  </div>`;
}

function buildElaHtml(elaData) {
  if (!elaData || !elaData.heatmap_base64) return "";
  const color =
    elaData.ela_score > 60
      ? "var(--misleading)"
      : elaData.ela_score > 40
        ? "var(--suspicious)"
        : "var(--verified)";
  return `
    <div class="ela-block">
      <div class="axe-mini-header">
        <span class="axe-label">🔬 ELA — Error Level Analysis</span>
        <span class="axe-score" style="color:${color}">Manipulation: ${elaData.ela_score}%</span>
      </div>
      <img src="${elaData.heatmap_base64}" class="ela-heatmap" alt="ELA heatmap"/>
      <p class="axe-expl">${escapeHtml(elaData.analysis || "")}</p>
      ${(elaData.flags || []).map((f) => `<span class="flag-tag">${f}</span>`).join("")}
    </div>`;
}

/* ══════════════════════════════════════════
   CHAT UI
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
    <div class="msg-bubble typing-bubble">
      <div class="typing"><span></span><span></span><span></span></div>
      <span id="typingStepText" class="typing-label">${STEPS[0]}</span>
    </div>`;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}
function removeTyping() {
  document.getElementById("typingMsg")?.remove();
}

/* ── Verdict labels tunisien ── */
function verdictLabel(verdict, confidence) {
  if (verdict === "verified")
    return confidence >= 75
      ? "✅ Sahha wallah — Verified!"
      : "✅ Yabi sahha — Likely true";
  if (verdict === "suspicious") return "⚠️ Zaama… méfie-toi";
  if (verdict === "misleading") return "🔴 Katous fil chkara — Misleading!";
  return "🤔 Ma3raftech — Unknown";
}
function authLabel(v) {
  if (v === "authentic") return "✅ Image authentique — caption correcte";
  if (v === "likely_ai") return "🤖 Image générée par IA ou contenu suspect";
  if (v === "manipulated")
    return "✂️ Image réelle utilisée dans un faux contexte";
  return "❓ Authenticité inconnue";
}
function sourceLabel(v) {
  if (v === "trusted") return "✅ Source fiable";
  if (v === "suspicious") return "⚠️ Source suspecte — meftek";
  return "❓ Source inconnue";
}

/* ══════════════════════════════════════════
   FIX 1 — axe2 score sémantiquement correct
   Le LLM retourne "confidence" = certitude du verdict,
   pas un score d'authenticité. Si verdict = misleading,
   la consistance réelle est basse (= 100 - confidence).
   Si verified, consistance = confidence.
══════════════════════════════════════════ */
function normalizeAxe2Score(verdict, llmConfidence) {
  const c = parseInt(llmConfidence ?? 50);
  if (verdict === "verified") return c; // haute consistance
  if (verdict === "misleading") return 100 - c; // basse consistance
  if (verdict === "suspicious") return Math.round(50 - (c - 50) * 0.5); // milieu
  return 50;
}

/* ══════════════════════════════════════════
   FIX 2 — verdict final cohérent avec le score
   Le verdict vient de l'Axe 2 (LLM) mais le score
   final combiné peut le contredire. On recalcule le
   verdict à partir du score combiné pour cohérence.
══════════════════════════════════════════ */
function scoreToVerdict(score) {
  if (score >= 70) return "verified";
  if (score >= 40) return "suspicious";
  return "misleading";
}

/* ══════════════════════════════════════════
   APPEND RESULT — FULLY EXPLAINABLE
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
  const axe2Score = parseInt(data.axe2_score ?? confidence);
  const uid = Date.now();

  const highlightedText = data.original_text
    ? `<div class="highlighted-content">
        <div class="axe-label" style="margin-bottom:6px">📝 Contenu analysé — mots suspects surlignés</div>
        <p class="highlighted-text">${highlightSuspiciousWords(data.original_text)}</p>
       </div>`
    : "";

  const ragHtml = buildRagHtml(data.ragData);
  const mlHtml = buildMlHtml(data.mlPredict, data.mlFeatures);
  const elaHtml = buildElaHtml(data.elaData);
  const breakdownHtml = buildScoreBreakdown(
    authScore,
    axe2Score,
    sScore,
    confidence,
  );

  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble result-bubble ${verdict}">

      <div class="result-top">
        <span class="result-verdict">${verdictLabel(verdict, confidence)}</span>
        <span class="result-score-badge">${confidence}%</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" id="bar-main-${uid}"></div>
      </div>
      <p class="result-expl">${escapeHtml(data.explanation || "—")}</p>

      ${breakdownHtml}
      ${highlightedText}
      ${ragHtml}
      ${mlHtml}
      ${elaHtml}

      ${
        authV
          ? `
      <div class="axe-mini axe1-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 1 · Vérité du contenu</span>
          <span class="axe-score">${authScore}%</span>
        </div>
        <div class="score-bar-wrap"><div class="score-bar axe1-bar" id="bar-axe1-${uid}"></div></div>
        <span class="axe-verdict-text">${authLabel(authV)}</span>
        <p class="axe-expl">${escapeHtml(data.authenticity_explanation || "—")}</p>
        ${(data.authenticity_flags || []).map((f) => `<span class="flag-tag">${f}</span>`).join("")}
      </div>`
          : ""
      }

      <div class="axe-mini axe3-mini">
        <div class="axe-mini-header">
          <span class="axe-label">Axe 3 · Crédibilité source</span>
          <span class="axe-score">${sScore}%</span>
        </div>
        <div class="score-bar-wrap"><div class="score-bar axe3-bar" id="bar-axe3-${uid}"></div></div>
        <span class="source-badge ${sVerdict}">${sourceLabel(sVerdict)}</span>
        <p class="axe-expl">${escapeHtml(data.source_explanation || "—")}</p>
        ${(data.source_flags || []).map((f) => `<span class="flag-tag">${f}</span>`).join("")}
      </div>

      <button class="new-analysis-btn" onclick="resetChat()">← Analyser autre chose</button>
    </div>`;

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

    document.querySelectorAll(".breakdown-bar").forEach((bar) => {
      const w = bar.style.width;
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = w;
      }, 50);
    });
    document.querySelectorAll(".ml-prob-bar").forEach((bar) => {
      const w = bar.style.width;
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = w;
      }, 100);
    });
  }, 100);
}

function appendBotError(text) {
  const win = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = "chat-msg bot";
  msg.innerHTML = `
    <div class="bot-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble error-bubble">⚠️ ${escapeHtml(text)}<br><small>Réessaie dans quelques secondes.</small></div>`;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function resetChat() {
  document.getElementById("chatInput").value = "";
  autoResize(document.getElementById("chatInput"));
  clearFile();
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
   SYSTEM PROMPTS
══════════════════════════════════════════ */
const SYSTEM_EXTRACT = `You are a message parser. Extract the main content/claim, caption, and URL.
Respond ONLY with valid JSON, no preamble:
{"content":"<main text>","caption":"<headline if present else empty>","url":"<URL if present else empty>"}`;

function buildAxe1Prompt(lang, mlContext, ragContext) {
  return `You are an expert in digital content authenticity.

You must evaluate TWO separate things:
A) IMAGE AUTHENTICITY: Is the image/media itself real or digitally manipulated/AI-generated?
B) CONTENT TRUTHFULNESS: Does the caption/text accurately describe what is shown?

Step-by-step:
1. Is the image itself authentic (real photo, not AI-generated, not Photoshopped)?
2. Is the text/caption truthful about what the image actually shows?
3. If a real image is used with a FALSE caption → verdict is "manipulated" (context manipulation).
4. If image itself is AI-generated or Photoshopped → verdict is "likely_ai" or "manipulated".
5. Only if BOTH image is real AND caption is truthful → verdict "authentic".

SCORING RULES (authenticity_score = overall content truthfulness score):
- Real image + FALSE caption (wrong person, wrong event) → score 5-20, verdict "manipulated"
- AI-generated image → score 20-40, verdict "likely_ai"  
- Real image + true caption → score 75-100, verdict "authentic"
- Uncertain → score 40-60, verdict "likely_ai"

${mlContext ? `[ML PRE-SCORE]: ${mlContext}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
Respond in ${lang}. ONLY valid JSON, no preamble:
{"authenticity_verdict":"authentic"|"likely_ai"|"manipulated","authenticity_score":<0-100>,"authenticity_explanation":"<2-3 sentences>","authenticity_flags":["<flag>"]}`;
}

function buildAxe2Prompt(lang, mlContext, ragContext) {
  return `You are an expert fact-checker and contextual consistency analyst.

Step-by-step:
1. What specific claims does this content make?
2. Internal contradictions or logical inconsistencies?
3. Does the caption/headline match the actual content?
4. Is content used in a misleading context?
5. Final verdict.

IMPORTANT: "confidence" must reflect HOW CERTAIN you are of the verdict (0-100).
If the content is clearly misleading, return verdict:"misleading" with high confidence (e.g. 90).
If clearly verified, return verdict:"verified" with high confidence.

${mlContext ? `[ML PRE-SCORE]: ${mlContext}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
Respond in ${lang}. ONLY valid JSON, no preamble:
{"verdict":"verified"|"suspicious"|"misleading","confidence":<0-100>,"explanation":"<2-4 sentences>","flags":["<flag>"]}`;
}

function buildAxe3Prompt(lang, mlFeatures, ragContext) {
  const domainInfo = mlFeatures
    ? `ML heuristic source score: ${mlFeatures.source_score}/100 (${mlFeatures.source_verdict}). Flags: ${(mlFeatures.combined_flags || []).join(", ")}.`
    : "";
  return `You are an expert in source credibility analysis.

Step-by-step:
1. Is the domain known and reputable?
2. Suspicious URL patterns, clickbait, spoofing?
3. Writing style credibility?
4. Final credibility verdict.

${domainInfo ? `[ML heuristic]: ${domainInfo}\n` : ""}${ragContext ? `[RAG SIMILAR CASES]: ${ragContext}\n` : ""}
Respond in ${lang}. ONLY valid JSON, no preamble:
{"source_verdict":"trusted"|"suspicious"|"unknown","source_score":<0-100>,"source_explanation":"<1-2 sentences>","source_flags":["<flag>"]}`;
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
    return await res.json();
  } catch {
    return null;
  }
}

async function callRAG(query, url, caption) {
  try {
    const res = await fetch("http://localhost:3000/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, url, caption }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function callELA(imageBase64, mediaType) {
  try {
    const res = await fetch("http://localhost:5001/ela", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: imageBase64,
        media_type: mediaType,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
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
══════════════════════════════════════════ */
function combineScores(mlScore, llmScore, mlWeight = 0.4) {
  if (mlScore === null || mlScore === undefined) return llmScore;
  return Math.round(mlScore * mlWeight + llmScore * (1 - mlWeight));
}

/* ══════════════════════════════════════════
   MAIN SEND — 5-step pipeline
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
    /* ── STEP 1: Extract signals ── */
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

    /* ── STEP 3: ML pre-score ── */
    updateTypingStep(2);
    const textForML = scrapedContent || extractedContent || "";
    const mlResult = await callMLPrescore(textForML, extractedUrl);
    const mlPredict = mlResult?.mlPredict || null;
    const mlFeatures = mlResult?.mlFeatures || null;

    let mlContextText = null;
    if (mlPredict) {
      mlContextText =
        `TF-IDF: fake_prob=${(mlPredict.fake_probability * 100).toFixed(0)}%, ` +
        `real_prob=${(mlPredict.real_probability * 100).toFixed(0)}%, ` +
        `verdict=${mlPredict.ml_verdict} (${mlPredict.confidence_label}). ` +
        `Linguistic: clickbait=${mlPredict.clickbait_count}, caps=${(mlPredict.caps_ratio * 100).toFixed(0)}%. ` +
        (mlPredict.flags?.length
          ? `Flags: ${mlPredict.flags.join(", ")}.`
          : "");
    }

    /* ── STEP 4: RAG search ── */
    updateTypingStep(3);
    const ragData = await callRAG(
      textForML || extractedContent,
      extractedUrl,
      extractedCaption,
    );
    let ragContext = ragData?.ragContext || "";

    if (ragData?.contextualGapScore > 50) {
      mlContextText =
        (mlContextText || "") +
        `\n[RAG gap score]: ${ragData.contextualGapScore}% (caption-content mismatch).`;
    }
    if (ragData?.quickFlagsResult?.flags?.length > 0) {
      mlContextText =
        (mlContextText || "") +
        `\n[RAG flags]: ${ragData.quickFlagsResult.flags.join(", ")}.`;
    }

    /* ── STEP 5: Build media blocks + ELA ── */
    updateTypingStep(4);
    let userContentMain = [];
    let elaData = null;
    let firstImageB64 = null;
    let firstImageType = null;

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

      if (!firstImageB64 && item.type === "image") {
        firstImageB64 = `data:${mediaType};base64,${b64}`;
        firstImageType = mediaType;
      }
    }

    if (firstImageB64) {
      elaData = await callELA(firstImageB64, firstImageType);
      if (elaData && mlContextText !== null) {
        mlContextText += `\n[ELA image forensics]: manipulation_score=${elaData.ela_score}%, flags=${(elaData.flags || []).join(", ")}.`;
      }
    }

    const contentForAnalysis =
      scrapedContent || extractedContent || "(no text provided)";
    const contextParts = [];
    if (extractedCaption) contextParts.push(`Caption: "${extractedCaption}"`);
    if (extractedUrl) contextParts.push(`Source URL: ${extractedUrl}`);
    contextParts.push(`Content:\n${contentForAnalysis}`);

    userContentMain.push({
      type: "text",
      text:
        contextParts.join("\n\n") + "\n\nReturn only the JSON verdict object.",
    });

    const userContentAxe3 = [
      {
        type: "text",
        text: extractedUrl
          ? `Source URL: ${extractedUrl}\nContext: "${extractedCaption || extractedContent}"\nReturn only the JSON verdict.`
          : `No URL. Analyze claim credibility: "${extractedContent}"\nReturn only the JSON verdict.`,
      },
    ];

    /* ── 3 parallel AI calls ── */
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

    /* ── FIX: Axe2 score = consistance sémantique, pas confiance brute ── */
    const axe2LLMScore = normalizeAxe2Score(
      result2.verdict,
      result2.confidence,
    );

    /* ── Combine scores: ML×40% + LLM×60% ── */
    const mlAuth = mlPredict ? mlPredict.ml_score : null;
    const mlSrcScore = mlFeatures ? mlFeatures.source_score : null;

    const axe1Combined = combineScores(
      mlAuth,
      result1.authenticity_score ?? 50,
      0.4,
    );
    const axe3Combined = combineScores(
      mlSrcScore,
      result3.source_score ?? 50,
      0.4,
    );

    /* ELA boost for Axe1 */
    const axe1Final = elaData
      ? Math.round(axe1Combined * 0.6 + (100 - elaData.ela_score) * 0.4)
      : axe1Combined;

    /* Global: Axe1×20% + Axe2×50% + Axe3×30% */
    const combinedScore = Math.round(
      axe1Final * 0.2 + axe2LLMScore * 0.5 + axe3Combined * 0.3,
    );

    /* ── FIX: verdict dérivé du score final, pas de l'Axe2 seul ── */
    const finalVerdict = scoreToVerdict(combinedScore);

    removeTyping();
    appendBotResult({
      verdict: finalVerdict,
      confidence: combinedScore,
      explanation: result2.explanation,
      flags: result2.flags,
      axe2_score: axe2LLMScore,
      /* Axe 1 */
      authenticity_verdict: result1.authenticity_verdict,
      authenticity_score: axe1Final,
      authenticity_explanation: result1.authenticity_explanation,
      authenticity_flags: result1.authenticity_flags,
      /* Axe 3 */
      source_verdict: result3.source_verdict,
      source_score: axe3Combined,
      source_explanation: result3.source_explanation,
      source_flags: result3.source_flags,
      /* Explainability data */
      original_text: extractedContent || scrapedContent,
      ragData,
      mlPredict,
      mlFeatures,
      elaData,
    });
  } catch (err) {
    removeTyping();
    appendBotError(err.message);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

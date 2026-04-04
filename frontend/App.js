/* ══════════════════════════════════════════
   قطوس في شكارة — App.js
   Axe 1 · Content Authenticity (NEW)
   Axe 2 · Contextual Consistency
   Axe 3 · Source Credibility
   ✅ Real URL scraping via /fetch-url
   ✅ 3 parallel AI calls
   ✅ Global verdict banner
   ✅ Score bar color by confidence
   ✅ Reset / analyze another
══════════════════════════════════════════ */

/* ─── Multimodal state ─── */
let mmCurrentTab = "text";
let mmFile = null;
let mmFileType = null;

/* ══════════════════════════════════════════
   EXAMPLES
══════════════════════════════════════════ */

const EXAMPLES = {
  fake: {
    text: "Catastrophic floods have completely destroyed the city of Paris today. Thousands of people are evacuating as the Eiffel Tower is surrounded by water. French authorities have declared a national emergency.",
    caption: "Paris underwater — catastrophic floods destroy the city today",
    url: "https://breaking-news24.net/paris-floods-emergency",
  },
  suspicious: {
    text: "Scientists have discovered that drinking 10 glasses of lemon water every day completely cures cancer in just 2 weeks. Big pharma doesn't want you to know this secret remedy that has been hidden for decades.",
    caption: "The cancer cure they don't want you to know about",
    url: "https://healthtruth-secrets.info/cancer-cure-lemon",
  },
  verified: {
    text: "NASA has confirmed that the James Webb Space Telescope has captured the deepest infrared image of the universe ever taken. The image shows thousands of galaxies, some of which formed less than a billion years after the Big Bang.",
    caption:
      "NASA releases deepest infrared image of the universe from James Webb Telescope",
    url: "https://www.nasa.gov/webbtelescope",
  },
};

function loadExample(type) {
  const ex = EXAMPLES[type];
  if (!ex) return;
  switchTab("text");
  const textArea = document.getElementById("contentText");
  const caption = document.getElementById("caption");
  const sourceUrl = document.getElementById("sourceUrl");
  if (textArea) textArea.value = ex.text;
  if (caption) caption.value = ex.caption;
  if (sourceUrl) sourceUrl.value = ex.url;
  mmUpdateStatus();
  document
    .getElementById("analyzeForm")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════ */

function switchTab(tab) {
  mmCurrentTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active);
  });
  document.querySelectorAll(".mm-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === "pane-" + tab);
  });
  mmUpdateStatus();
}

const textArea = document.getElementById("contentText");
if (textArea) {
  textArea.addEventListener("input", mmUpdateStatus);
  textArea.addEventListener("focus", () =>
    document.getElementById("inputZone").classList.add("focused"),
  );
  textArea.addEventListener("blur", () =>
    document.getElementById("inputZone").classList.remove("focused"),
  );
}

const urlInput = document.getElementById("contentUrl");
if (urlInput) {
  urlInput.addEventListener("input", mmUpdateStatus);
  urlInput.addEventListener("focus", () =>
    document.getElementById("inputZone").classList.add("focused"),
  );
  urlInput.addEventListener("blur", () =>
    document.getElementById("inputZone").classList.remove("focused"),
  );
}

function mmDragOver(e, dropId) {
  e.preventDefault();
  document.getElementById(dropId).classList.add("drag-over");
}

function mmDragLeave(dropId) {
  document.getElementById(dropId).classList.remove("drag-over");
}

function mmDropFile(e, type) {
  e.preventDefault();
  mmDragLeave(type === "image" ? "dropImage" : "dropVideo");
  const file = e.dataTransfer.files[0];
  if (file) mmRenderPreview(file, type);
}

function mmFileChosen(e, type) {
  const file = e.target.files[0];
  if (file) mmRenderPreview(file, type);
}

function mmRenderPreview(file, type) {
  mmFile = file;
  mmFileType = type;
  const stripId = type === "image" ? "previewImage" : "previewVideo";
  const strip = document.getElementById(stripId);
  const blobUrl = URL.createObjectURL(file);
  const sizeStr =
    file.size < 1_048_576
      ? (file.size / 1024).toFixed(0) + " KB"
      : (file.size / 1_048_576).toFixed(1) + " MB";

  const thumb = document.createElement("div");
  thumb.className = "preview-thumb";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = blobUrl;
    img.alt = file.name;
    thumb.appendChild(img);
  } else {
    const vid = document.createElement("video");
    vid.src = blobUrl;
    vid.muted = true;
    vid.preload = "metadata";
    vid.addEventListener("loadedmetadata", () => {
      vid.currentTime = 0.5;
    });
    thumb.appendChild(vid);
  }

  const rm = document.createElement("button");
  rm.type = "button";
  rm.className = "preview-remove";
  rm.textContent = "×";
  rm.setAttribute("aria-label", "Remove file");
  rm.addEventListener("click", () => {
    strip.innerHTML = "";
    strip.classList.remove("has-file");
    mmFile = null;
    mmFileType = null;
    const inputEl = document.getElementById(
      type === "image" ? "imgInput" : "vidInput",
    );
    if (inputEl) inputEl.value = "";
    mmUpdateStatus();
  });
  thumb.appendChild(rm);

  const meta = document.createElement("div");
  meta.className = "preview-meta";
  meta.innerHTML = `<div class="preview-name">${file.name}</div><div class="preview-size">${sizeStr}</div>`;

  strip.innerHTML = "";
  strip.appendChild(thumb);
  strip.appendChild(meta);
  strip.classList.add("has-file");
  mmUpdateStatus();
}

function mmUpdateStatus() {
  const pill = document.getElementById("mmStatusPill");
  const label = document.getElementById("mmStatusLabel");
  const count = document.getElementById("mmCharCount");
  if (!pill) return;
  count.textContent = "";

  switch (mmCurrentTab) {
    case "text": {
      const val = textArea ? textArea.value.trim() : "";
      if (val.length > 10) {
        pill.className = "status-pill ready";
        label.textContent = "Text ready";
        count.textContent = textArea.value.length + " chars";
      } else {
        pill.className = "status-pill";
        label.textContent = "Waiting for content";
      }
      break;
    }
    case "image":
    case "video": {
      if (mmFile) {
        pill.className = "status-pill ready";
        label.textContent =
          mmFileType === "image" ? "Image ready" : "Video ready";
      } else {
        pill.className = "status-pill";
        label.textContent = "Waiting for file";
      }
      break;
    }
    case "url": {
      const val = urlInput ? urlInput.value.trim() : "";
      try {
        new URL(val);
        pill.className = "status-pill ready";
        label.textContent = "URL valid";
      } catch {
        pill.className = val.length ? "status-pill invalid" : "status-pill";
        label.textContent = val.length ? "Invalid URL" : "Waiting for URL";
      }
      break;
    }
  }
}

function mmGetContent() {
  switch (mmCurrentTab) {
    case "text":
      return { type: "text", value: textArea ? textArea.value.trim() : "" };
    case "image":
    case "video":
      return { type: mmFileType, file: mmFile };
    case "url":
      return { type: "url", value: urlInput ? urlInput.value.trim() : "" };
  }
}

/* ══════════════════════════════════════════
   SYSTEM PROMPTS
══════════════════════════════════════════ */

const SYSTEM_PROMPT_AXE1 = `You are an expert in digital content authenticity and AI-generated content detection.
Analyze the provided content (text, image, or video frame) for signs of:
- AI-generated text (unnatural fluency, lack of specific details, hedging language, generic phrasing)
- Image manipulation (inconsistent lighting, artifacts, unnatural edges, cloning artifacts)
- Deepfake indicators (facial inconsistencies, unnatural blinking, hair/teeth artifacts)
- Recycled or copy-pasted content reused in a misleading new context

Always respond with ONLY a valid JSON object — no preamble, no markdown fences — in exactly this shape:
{
  "authenticity_verdict": "authentic" | "likely_ai" | "manipulated",
  "authenticity_score": <integer 0-100>,
  "authenticity_explanation": "<2-3 sentence analysis>",
  "authenticity_flags": ["<short flag>", ...]
}`;

const SYSTEM_PROMPT_AXE2 = `You are an expert fact-checker and contextual consistency analyst.
Given a piece of content (text, image, video frame, or URL), analyze whether it is contextually accurate, potentially misleading, or verifiably false.

Always respond with ONLY a valid JSON object — no preamble, no markdown fences — in exactly this shape:
{
  "verdict": "verified" | "suspicious" | "misleading",
  "confidence": <integer 0-100>,
  "explanation": "<2-4 sentence analysis>",
  "flags": ["<short flag>", ...]
}`;

const SYSTEM_PROMPT_AXE3 = `You are an expert in source credibility analysis.
Analyze the provided source URL and context for trustworthiness signals.
Look for: suspicious domain patterns, spoofed legitimate sites, clickbait URLs, very new domains, misleading subdomains, writing style inconsistencies.

Always respond with ONLY a valid JSON object — no preamble, no markdown fences — in exactly this shape:
{
  "source_verdict": "trusted" | "suspicious" | "unknown",
  "source_score": <integer 0-100>,
  "source_explanation": "<2-3 sentence analysis>",
  "source_flags": ["<short flag>", ...]
}`;

/* ══════════════════════════════════════════
   PROMPT BUILDERS
══════════════════════════════════════════ */

function buildPromptAxe2({
  text,
  url,
  caption,
  sourceUrl,
  isImage,
  isVideo,
  videoName,
}) {
  let parts = [];
  if (isImage)
    parts.push(
      "Analyze the image provided for contextual consistency and potential misinformation.",
    );
  else if (isVideo)
    parts.push(
      `Analyze this video frame from "${videoName}" for contextual consistency and potential misinformation.`,
    );
  else if (url)
    parts.push(
      `The content comes from this URL: ${url}\nAnalyze the URL structure and any contextual signals you can infer.`,
    );
  else if (text) parts.push(`Analyze the following content:\n\n${text}`);
  if (caption) parts.push(`\nClaimed title/caption: "${caption}"`);
  if (sourceUrl) parts.push(`Source URL: ${sourceUrl}`);
  parts.push("\nReturn only the JSON verdict object.");
  return parts.join("\n");
}

function buildPromptAxe3({ sourceUrl, caption }) {
  let parts = [];
  if (sourceUrl) {
    parts.push(`Analyze this source URL for credibility:\n${sourceUrl}`);
    parts.push(
      `Check for: suspicious domain name, recently created domains, spoofed legitimate sites, clickbait patterns.`,
    );
  } else {
    parts.push(`No source URL was provided.`);
    parts.push(
      `Analyze the writing style and credibility signals from this caption: "${caption}"`,
    );
  }
  parts.push("\nReturn only the JSON verdict object.");
  return parts.join("\n");
}

/* ══════════════════════════════════════════
   FORM + UI
══════════════════════════════════════════ */

const form = document.getElementById("analyzeForm");
const submitBtn = document.getElementById("submitBtn");
const resultSec = document.getElementById("resultSection");
const consoleSec = document.getElementById("consoleSection");
const consoleEl = document.getElementById("consoleBody");

function clog(msg) {
  consoleSec.hidden = false;
  consoleEl.textContent += msg + "\n";
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.querySelector(".btn-text").hidden = on;
  submitBtn.querySelector(".btn-arrow").hidden = on;
  submitBtn.querySelector(".btn-loader").hidden = !on;
}

function showGlobalVerdict(verdict, combinedScore) {
  const gv = document.getElementById("globalVerdict");
  const gi = document.getElementById("globalIcon");
  const gt = document.getElementById("globalText");
  const gs = document.getElementById("globalScore");
  if (!gv) return;
  const icons = { verified: "✓", suspicious: "⚠", misleading: "✗" };
  const texts = {
    verified: "Content appears trustworthy",
    suspicious: "Content requires verification",
    misleading: "Content is likely misleading",
  };
  gv.hidden = false;
  gv.className = "global-verdict " + verdict;
  gi.textContent = icons[verdict] || "?";
  gt.textContent = texts[verdict] || "Unknown";
  gs.textContent = combinedScore + "%";
}

function renderFlags(containerId, flags) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  (Array.isArray(flags) ? flags : []).forEach((f) => {
    const span = document.createElement("span");
    span.className = "flag-tag";
    span.textContent = f;
    el.appendChild(span);
  });
}

function animateBar(barId, score) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const color =
    score >= 70
      ? "var(--verified)"
      : score >= 40
        ? "var(--suspicious)"
        : "var(--misleading)";
  setTimeout(() => {
    bar.style.width = score + "%";
    bar.style.background = color;
  }, 50);
}

function showResult(data) {
  resultSec.hidden = false;

  /* ── Axe 1 ── */
  const axe1Card = document.getElementById("axe1Result");
  if (axe1Card && data.authenticity_verdict) {
    axe1Card.hidden = false;
    const aVerdict = (data.authenticity_verdict || "unknown").toLowerCase();
    const axe1Class =
      aVerdict === "authentic"
        ? "verified"
        : aVerdict === "likely_ai"
          ? "suspicious"
          : aVerdict === "manipulated"
            ? "misleading"
            : "unknown";
    document.getElementById("axe1Dot").className = "status-dot " + axe1Class;
    document.getElementById("axe1Verdict").textContent = aVerdict
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    document.getElementById("axe1Score").textContent =
      (data.authenticity_score ?? 0) + "%";
    document.getElementById("axe1Explanation").textContent =
      data.authenticity_explanation || "—";
    renderFlags("axe1Flags", data.authenticity_flags);
    animateBar("axe1Bar", data.authenticity_score ?? 0);
  }

  /* ── Axe 2 ── */
  const verdict = (data.verdict || "unknown").toLowerCase();
  const confidence = parseInt(data.confidence ?? 0);
  document.getElementById("statusDot").className = "status-dot " + verdict;
  document.getElementById("statusText").textContent =
    verdict.charAt(0).toUpperCase() + verdict.slice(1);
  document.getElementById("scoreValue").textContent = confidence + "%";
  document.getElementById("resultExplanation").textContent =
    data.explanation || "—";
  renderFlags("resultFlags", data.flags);
  animateBar("scoreBar", confidence);

  /* ── Axe 3 ── */
  const sourceCard = document.getElementById("sourceResult");
  if (sourceCard && data.source_verdict) {
    sourceCard.hidden = false;
    const sVerdict = (data.source_verdict || "unknown").toLowerCase();
    document.getElementById("sourceDot").className = "status-dot " + sVerdict;
    document.getElementById("sourceVerdict").textContent =
      sVerdict.charAt(0).toUpperCase() + sVerdict.slice(1);
    document.getElementById("sourceScore").textContent =
      (data.source_score ?? 0) + "%";
    document.getElementById("sourceExplanation").textContent =
      data.source_explanation || "—";
    renderFlags("sourceFlags", data.source_flags);
    animateBar("sourceBar", data.source_score ?? 0);
  }

  document.getElementById("resultRaw").textContent = JSON.stringify(
    data,
    null,
    2,
  );
  showGlobalVerdict(verdict, confidence);
  const resetBtn = document.getElementById("analyzeAnotherBtn");
  if (resetBtn) resetBtn.hidden = false;
  resultSec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAll() {
  document.getElementById("resultSection").hidden = true;
  document.getElementById("consoleSection").hidden = true;
  document.getElementById("analyzeAnotherBtn").hidden = true;
  const gv = document.getElementById("globalVerdict");
  if (gv) gv.hidden = true;
  ["sourceResult", "axe1Result"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
  document.getElementById("contentText").value = "";
  document.getElementById("caption").value = "";
  document.getElementById("sourceUrl").value = "";
  ["previewImage", "previewVideo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = "";
      el.classList.remove("has-file");
    }
  });
  ["imgInput", "vidInput"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  mmFile = null;
  mmFileType = null;
  consoleEl.textContent = "";
  switchTab("text");
  mmUpdateStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("rawToggle")?.addEventListener("click", () => {
  const raw = document.getElementById("resultRaw");
  const arrow = document.querySelector(".toggle-arrow");
  raw.hidden = !raw.hidden;
  arrow.classList.toggle("open", !raw.hidden);
});

/* ══════════════════════════════════════════
   SUBMIT — Axe 1 + Axe 2 + Axe 3 in parallel
══════════════════════════════════════════ */

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  consoleEl.textContent = "";

  const content = mmGetContent();
  const caption = document.getElementById("caption")?.value.trim() || "";
  const sourceUrl = document.getElementById("sourceUrl")?.value.trim() || "";

  if (content.type === "text" && !content.value) {
    clog("[error] No text content provided.");
    return;
  }
  if ((content.type === "image" || content.type === "video") && !content.file) {
    clog("[error] No file selected.");
    return;
  }
  if (content.type === "url" && !content.value) {
    clog("[error] No URL provided.");
    return;
  }

  setLoading(true);
  clog("[info] Building request…");

  try {
    let userContentAxe2 = [];

    if (content.type === "text") {
      clog("[info] Mode: text");
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({ text: content.value, caption, sourceUrl }),
      });
    } else if (content.type === "url") {
      /* ✅ Real URL scraping */
      clog("[info] Mode: URL → " + content.value + " (fetching real content…)");
      let scrapedText = "";
      let scrapedTitle = "";
      try {
        const fetchRes = await fetch("http://localhost:3000/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: content.value }),
        });
        if (fetchRes.ok) {
          const scraped = await fetchRes.json();
          scrapedTitle = scraped.ogTitle || scraped.title || "";
          scrapedText = [
            scraped.ogTitle || scraped.title,
            scraped.ogDesc || scraped.description,
            scraped.bodyText,
          ]
            .filter(Boolean)
            .join("\n\n");
          clog("[info] Scraped " + scrapedText.length + " chars from URL");
        } else {
          clog(
            "[warn] Could not scrape URL — falling back to URL-only analysis",
          );
        }
      } catch (err) {
        clog("[warn] Scrape error: " + err.message + " — falling back");
      }
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({
          text: scrapedText || null,
          url: scrapedText ? null : content.value,
          caption: caption || scrapedTitle,
          sourceUrl: content.value,
        }),
      });
    } else if (content.type === "image") {
      /* ✅ Image */
      clog("[info] Mode: image → " + content.file.name);
      const b64 = await fileToBase64(content.file);
      userContentAxe2.push({
        type: "image",
        source: {
          type: "base64",
          media_type: content.file.type || "image/jpeg",
          data: b64,
        },
      });
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({ caption, sourceUrl, isImage: true }),
      });
    } else if (content.type === "video") {
      /* ✅ Video */
      clog(
        "[info] Mode: video → " + content.file.name + " (extracting frame…)",
      );
      const b64 = await videoFrame(content.file);
      userContentAxe2.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: b64 },
      });
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({
          caption,
          sourceUrl,
          isVideo: true,
          videoName: content.file.name,
        }),
      });
    }

    clog("[info] Launching Axe 1 + Axe 2 + Axe 3 in parallel…");

    /* ✅ 3 parallel calls */
    const [response2, response3, response1] = await Promise.all([
      fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT_AXE2,
          userContent: userContentAxe2,
        }),
      }),
      fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT_AXE3,
          userContent: [
            { type: "text", text: buildPromptAxe3({ sourceUrl, caption }) },
          ],
        }),
      }),
      fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT_AXE1,
          userContent: userContentAxe2,
        }),
      }),
    ]);

    if (!response2.ok) {
      clog("[error] Axe 2 failed: " + response2.status);
      setLoading(false);
      return;
    }
    if (!response3.ok) {
      clog("[error] Axe 3 failed: " + response3.status);
      setLoading(false);
      return;
    }

    const data2 = await response2.json();
    const data3 = await response3.json();
    const result2 = JSON.parse(
      (data2.result || "{}").replace(/```json|```/gi, "").trim(),
    );
    const result3 = JSON.parse(
      (data3.result || "{}").replace(/```json|```/gi, "").trim(),
    );
    clog("[axe2 raw] " + JSON.stringify(result2));
    clog("[axe3 raw] " + JSON.stringify(result3));

    /* Axe 1 non-blocking */
    let result1 = {
      authenticity_verdict: "authentic",
      authenticity_score: 50,
      authenticity_explanation: "Authenticity analysis unavailable.",
      authenticity_flags: [],
    };
    try {
      const data1 = await response1.json();
      const raw1 = (data1.result || "{}").replace(/```json|```/gi, "").trim();
      result1 = JSON.parse(raw1);
      clog("[axe1 raw] " + JSON.stringify(result1));
    } catch (e) {
      clog("[warn] Axe 1 parse failed — using fallback");
    }

    /* ✅ Combined score: Axe1=20%, Axe2=50%, Axe3=30% */
    const combinedScore = Math.round(
      (result1.authenticity_score ?? 50) * 0.2 +
        result2.confidence * 0.5 +
        result3.source_score * 0.3,
    );

    clog(
      "[info] Axe1 authenticity: " +
        result1.authenticity_verdict +
        " (" +
        (result1.authenticity_score ?? 0) +
        "%)",
    );
    clog(
      "[info] Axe2 consistency:  " +
        result2.verdict +
        " (" +
        result2.confidence +
        "%)",
    );
    clog(
      "[info] Axe3 credibility:  " +
        result3.source_verdict +
        " (" +
        result3.source_score +
        "%)",
    );
    clog("[info] Combined score:    " + combinedScore + "%");

    showResult({
      authenticity_verdict: result1.authenticity_verdict,
      authenticity_score: result1.authenticity_score,
      authenticity_explanation: result1.authenticity_explanation,
      authenticity_flags: result1.authenticity_flags,
      verdict: result2.verdict,
      confidence: combinedScore,
      explanation: result2.explanation,
      flags: [
        ...(result1.authenticity_flags || []),
        ...(result2.flags || []),
        ...(result3.source_flags || []),
      ],
      source_verdict: result3.source_verdict,
      source_score: result3.source_score,
      source_explanation: result3.source_explanation,
      source_flags: result3.source_flags,
    });
  } catch (err) {
    clog("[error] " + err.message);
  } finally {
    setLoading(false);
  }
});

/* ══════════════════════════════════════════
   UTILITIES
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
      reject(new Error("Could not load video"));
    });
  });
}

mmUpdateStatus();

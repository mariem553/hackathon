/* ══════════════════════════════════════════
   قطوس في شكارة — app.js
   Axe 2 · Contextual Consistency
   Axe 3 · Source Credibility
══════════════════════════════════════════ */

/* ─── Multimodal state ─── */
let mmCurrentTab = "text";
let mmFile = null;
let mmFileType = null;

/* ─── Tab switching ─── */
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

/* ─── Text input ─── */
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

/* ─── URL input ─── */
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

/* ─── Drag & drop helpers ─── */
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

/* ─── Preview rendering ─── */
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
  meta.innerHTML = `
    <div class="preview-name">${file.name}</div>
    <div class="preview-size">${sizeStr}</div>
  `;

  strip.innerHTML = "";
  strip.appendChild(thumb);
  strip.appendChild(meta);
  strip.classList.add("has-file");

  mmUpdateStatus();
}

/* ─── Status pill updater ─── */
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

/* ─── Collect multimodal content ─── */
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

const SYSTEM_PROMPT_AXE2 = `You are an expert fact-checker and contextual consistency analyst.
Given a piece of content (text, image, or URL), you analyze whether it is contextually accurate,
potentially misleading, or verifiably false.

Always respond with ONLY a valid JSON object — no preamble, no markdown fences — in exactly this shape:
{
  "verdict": "verified" | "suspicious" | "misleading",
  "confidence": <integer 0-100>,
  "explanation": "<2-4 sentence analysis>",
  "flags": ["<short flag>", ...]
}`;

const SYSTEM_PROMPT_AXE3 = `You are an expert in source credibility analysis.
Analyze the provided source URL and context for trustworthiness signals.
Look for: suspicious domain patterns, spoofed legitimate sites, clickbait URLs,
very new domains, misleading subdomains, writing style inconsistencies.

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
      `Analyze this video thumbnail/frame from the file "${videoName}" for contextual consistency.`,
    );
  else if (url)
    parts.push(
      `Analyze the content at this URL for contextual consistency:\n${url}`,
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

function showResult(data) {
  resultSec.hidden = false;

  /* ── Axe 2 result ── */
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const scoreVal = document.getElementById("scoreValue");
  const scoreBar = document.getElementById("scoreBar");
  const expl = document.getElementById("resultExplanation");
  const flagsEl = document.getElementById("resultFlags");
  const rawEl = document.getElementById("resultRaw");

  const verdict = (data.verdict || "unknown").toLowerCase();
  const confidence = parseInt(data.confidence ?? 0);
  const explanation = data.explanation || "—";
  const flags = Array.isArray(data.flags) ? data.flags : [];

  dot.className = "status-dot " + verdict;
  text.textContent = verdict.charAt(0).toUpperCase() + verdict.slice(1);
  scoreVal.textContent = confidence + "%";
  expl.textContent = explanation;

  flagsEl.innerHTML = "";
  flags.forEach((f) => {
    const span = document.createElement("span");
    span.className = "flag-tag";
    span.textContent = f;
    flagsEl.appendChild(span);
  });

  setTimeout(() => {
    scoreBar.style.width = confidence + "%";
  }, 50);

  /* ── Axe 3 result ── */
  const sourceSection = document.getElementById("sourceResult");
  if (sourceSection && data.source_verdict) {
    sourceSection.hidden = false;

    const sv = document.getElementById("sourceVerdict");
    const ss = document.getElementById("sourceScore");
    const se = document.getElementById("sourceExplanation");
    const sf = document.getElementById("sourceFlags");
    const sb = document.getElementById("sourceBar");

    sv.textContent =
      data.source_verdict.charAt(0).toUpperCase() +
      data.source_verdict.slice(1);
    sv.className = "source-badge " + data.source_verdict;
    ss.textContent = data.source_score + "%";
    se.textContent = data.source_explanation || "—";

    if (sf) {
      sf.innerHTML = "";
      (data.source_flags || []).forEach((f) => {
        const span = document.createElement("span");
        span.className = "flag-tag";
        span.textContent = f;
        sf.appendChild(span);
      });
    }

    if (sb) {
      setTimeout(() => {
        sb.style.width = data.source_score + "%";
      }, 50);
    }
  }

  rawEl.textContent = JSON.stringify(data, null, 2);
}

/* raw-toggle */
document.getElementById("rawToggle")?.addEventListener("click", () => {
  const raw = document.getElementById("resultRaw");
  const arrow = document.querySelector(".toggle-arrow");
  raw.hidden = !raw.hidden;
  arrow.classList.toggle("open", !raw.hidden);
});

/* ══════════════════════════════════════════
   SUBMIT — Axe 2 + Axe 3 in parallel
══════════════════════════════════════════ */

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  consoleEl.textContent = "";

  const content = mmGetContent();
  const caption = document.getElementById("caption")?.value.trim() || "";
  const sourceUrl = document.getElementById("sourceUrl")?.value.trim() || "";

  /* basic validation */
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
    /* ── Build Axe 2 user content ── */
    let userContentAxe2 = [];

    if (content.type === "text") {
      clog("[info] Mode: text");
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({ text: content.value, caption, sourceUrl }),
      });
    } else if (content.type === "url") {
      clog("[info] Mode: URL → " + content.value);
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({ url: content.value, caption, sourceUrl }),
      });
    } else if (content.type === "image") {
      clog("[info] Mode: image → " + content.file.name);
      const b64 = await fileToBase64(content.file);
      const mediaType = content.file.type || "image/jpeg";
      userContentAxe2.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: b64 },
      });
      userContentAxe2.push({
        type: "text",
        text: buildPromptAxe2({ caption, sourceUrl, isImage: true }),
      });
    } else if (content.type === "video") {
      clog(
        "[info] Mode: video → " + content.file.name + " (extracting frame…)",
      );
      const frameB64 = await videoFrame(content.file);
      userContentAxe2.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: frameB64 },
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

    clog("[info] Launching Axe 2 + Axe 3 in parallel…");

    /* ── Two API calls at the same time ── */
    const [response2, response3] = await Promise.all([
      /* Axe 2 — Contextual Consistency — goes through your secure server */
      fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT_AXE2,
          userContent: userContentAxe2,
        }),
      }),

      /* Axe 3 — Source Credibility — goes through your secure server */
      fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT_AXE3,
          userContent: [
            {
              type: "text",
              text: buildPromptAxe3({ sourceUrl, caption }),
            },
          ],
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

    /* ── Parse both responses ── */
    const data2 = await response2.json();
    const data3 = await response3.json();

    const raw2 = data2.result || "{}";
    const raw3 = data3.result || "{}";

    clog("[axe2 raw] " + raw2);
    clog("[axe3 raw] " + raw3);

    const result2 = JSON.parse(raw2.replace(/```json|```/gi, "").trim());
    const result3 = JSON.parse(raw3.replace(/```json|```/gi, "").trim());

    /* ── Combine scores: Axe2 = 60%, Axe3 = 40% ── */
    const combinedScore = Math.round(
      result2.confidence * 0.6 + result3.source_score * 0.4,
    );

    clog("[info] Axe2 score: " + result2.confidence + "%");
    clog("[info] Axe3 score: " + result3.source_score + "%");
    clog("[info] Combined score: " + combinedScore + "%");

    /* ── Merge and display ── */
    const merged = {
      verdict: result2.verdict,
      confidence: combinedScore,
      explanation: result2.explanation,
      flags: [...(result2.flags || []), ...(result3.source_flags || [])],
      source_verdict: result3.source_verdict,
      source_score: result3.source_score,
      source_explanation: result3.source_explanation,
      source_flags: result3.source_flags,
    };

    showResult(merged);
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

/* ─── Init ─── */
mmUpdateStatus();

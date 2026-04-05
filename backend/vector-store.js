/* ══════════════════════════════════════════════════════════════════════════════════
   vector-store.js — RAG ENGINE FOR KATOUS FI CHKARA
   
   ROLE IN COMPLETE ARCHITECTURE:
   ╔════════════════════════════════════════════════════════════════════════════╗
   ║                          COMPLETE PIPELINE                                  ║
   ║  INPUT (text/image/video/URL)                                              ║
   │        ↓                                                                    ║
   │  RAG — VECTOR SEARCH (THIS FILE)                                           ║
   │    • Embed input → TF-IDF bag-of-words                                      ║
   │    • Search top-3 similar known cases from KB                               ║
   │    • Extract flags/patterns from similar cases                              ║
   │        ↓                                                                    ║
   │  CONTEXTUAL SIMILARITY ANALYSIS                                            ║
   │    • Caption vs content distance                                            ║
   │    • Paraphrase detection score                                             ║
   │    • Contextual gap score                                                   ║
   │        ↓                                                                    ║
   │  3 PARALLEL AXES (with RAG context injected):                              ║
   │    ├─ AXE 1: Content Authenticity [ELA + Vision + Groq]                   ║
   │    ├─ AXE 2: Contextual Consistency [TF-IDF + CoT + Groq]                 ║
   │    └─ AXE 3: Source Credibility [Features + Groq]                         ║
   │        ↓                                                                    ║
   │  SCORE AGGREGATION                                                         ║
   │    Per-axis: ML×40% + LLM×60%                                              ║
   │    Combined: Axe1×20% + Axe2×50% + Axe3×30%                               ║
   │        ↓                                                                    ║
   │  FINAL VERDICT + UI                                                        ║
   │    3 result cards + reasoning + ELA heatmap                                ║
   ╚════════════════════════════════════════════════════════════════════════════╝
   
   FUNCTIONS PROVIDED:
   • loadKB() / saveKB() — persistence
   • search(queryText, topK) — RAG similarity search
   • searchByDomain(url) — domain-based lookup
   • contextualGapScore(content, caption) — paraphrase detection
   • addEntry() — save verified analyses
   • stats() — knowledge base statistics
══════════════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_PATH = join(__dirname, "knowledge-base.json");

/* ── Load knowledge base ── */
function loadKB() {
  if (!existsSync(KB_PATH)) return { version: "1.0", entries: [] };
  try {
    return JSON.parse(readFileSync(KB_PATH, "utf-8"));
  } catch {
    return { version: "1.0", entries: [] };
  }
}

/* ── Save knowledge base ── */
function saveKB(kb) {
  try {
    writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), "utf-8");
  } catch (e) {
    console.error("[kb] Save failed:", e.message);
  }
}

/* ══════════════════════════════════════════
   COSINE SIMILARITY
   Works on plain number arrays
══════════════════════════════════════════ */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/* ══════════════════════════════════════════
   TF-IDF STYLE FALLBACK EMBEDDING
   Used when Groq embedding not available
   Produces a simple bag-of-words vector
══════════════════════════════════════════ */
const VOCAB_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "and",
  "or",
  "but",
  "not",
  "no",
  "so",
  "if",
  "then",
  "than",
  "that",
  "this",
  "it",
  "its",
  "they",
  "their",
  "there",
  "what",
  "which",
  "who",
  "when",
  "where",
  "how",
  "all",
  "each",
  "every",
  "both",
]);

function textToVector(text, vocab) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !VOCAB_STOPWORDS.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  // Build vector aligned to vocab
  return vocab.map((term) => freq[term] || 0);
}

function buildVocab(entries) {
  const allWords = new Set();
  for (const e of entries) {
    const txt = `${e.content} ${e.caption || ""}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !VOCAB_STOPWORDS.has(w));
    txt.forEach((w) => allWords.add(w));
  }
  return Array.from(allWords);
}

/* ══════════════════════════════════════════
   VECTOR STORE CLASS
══════════════════════════════════════════ */
export class VectorStore {
  constructor() {
    this.kb = loadKB();
    this.vocab = buildVocab(this.kb.entries);
    console.log(
      `[vector-store] Loaded ${this.kb.entries.length} entries, vocab size: ${this.vocab.length}`,
    );
  }

  /* ── Rebuild vocab when new entries added ── */
  rebuildVocab() {
    this.vocab = buildVocab(this.kb.entries);
  }

  /* ── Get or compute TF-IDF embedding for an entry ── */
  getEntryEmbedding(entry) {
    if (entry.embedding && Array.isArray(entry.embedding)) {
      return entry.embedding;
    }
    const text = `${entry.content} ${entry.caption || ""}`;
    return textToVector(text, this.vocab);
  }

  /* ── Compute embedding for a query ── */
  queryEmbedding(text) {
    return textToVector(text, this.vocab);
  }

  /* ══════════════════════════════════════════
     SEARCH — find top-k most similar entries
  ══════════════════════════════════════════ */
  search(queryText, topK = 3, minSimilarity = 0.1) {
    if (this.kb.entries.length === 0) return [];

    const queryVec = this.queryEmbedding(queryText);
    const scored = [];

    for (const entry of this.kb.entries) {
      const entryVec = this.getEntryEmbedding(entry);

      // Align dimensions if vocab changed
      const alignedQuery =
        queryVec.length >= entryVec.length
          ? queryVec.slice(0, entryVec.length)
          : [
              ...queryVec,
              ...new Array(entryVec.length - queryVec.length).fill(0),
            ];

      const sim = cosineSimilarity(alignedQuery, entryVec);

      if (sim >= minSimilarity) {
        scored.push({ entry, similarity: sim });
      }
    }

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(({ entry, similarity }) => ({
        id: entry.id,
        content: entry.content,
        caption: entry.caption,
        url: entry.url,
        verdict: entry.verdict,
        confidence: entry.confidence,
        flags: entry.flags,
        explanation: entry.explanation,
        similarity: Math.round(similarity * 100) / 100,
      }));
  }

  /* ══════════════════════════════════════════
     DOMAIN SEARCH — check if domain is known
  ══════════════════════════════════════════ */
  searchByDomain(url) {
    if (!url) return [];
    try {
      const domain = new URL(
        url.startsWith("http") ? url : "https://" + url,
      ).hostname.replace("www.", "");
      return this.kb.entries
        .filter((e) => {
          if (!e.url) return false;
          const eDomain = e.url
            .replace("www.", "")
            .replace(/https?:\/\//, "")
            .split("/")[0];
          return eDomain.includes(domain) || domain.includes(eDomain);
        })
        .map((e) => ({ ...e, similarity: 1.0, matchType: "domain" }));
    } catch {
      return [];
    }
  }

  /* ══════════════════════════════════════════
     ADD ENTRY — save a new verified analysis
  ══════════════════════════════════════════ */
  addEntry({
    content,
    caption,
    url,
    verdict,
    source_verdict,
    authenticity_verdict,
    confidence,
    flags,
    explanation,
  }) {
    const id = `kb_${Date.now()}`;
    const entry = {
      id,
      content: (content || "").slice(0, 500),
      caption: caption || "",
      url: url || "",
      verdict: verdict || "unknown",
      source_verdict: source_verdict || "unknown",
      authenticity_verdict: authenticity_verdict || "unknown",
      confidence: confidence || 50,
      flags: flags || [],
      explanation: (explanation || "").slice(0, 300),
      embedding: null,
      timestamp: new Date().toISOString(),
    };

    this.kb.entries.push(entry);
    this.rebuildVocab();
    saveKB(this.kb);
    console.log(
      `[kb] Added entry ${id} | verdict: ${verdict} | total: ${this.kb.entries.length}`,
    );
    return id;
  }

  /* ── Stats ── */
  stats() {
    const entries = this.kb.entries;
    const byVerdict = entries.reduce((acc, e) => {
      acc[e.verdict] = (acc[e.verdict] || 0) + 1;
      return acc;
    }, {});
    return { total: entries.length, byVerdict, vocabSize: this.vocab.length };
  }

  /* ══════════════════════════════════════════════════════════════════════════════
     CONTEXTUAL ANALYSIS FUNCTIONS
     Used by frontend before calling Groq to detect common manipulation patterns
     ══════════════════════════════════════════════════════════════════════════════ */

  /* ── Paraphrase / Caption-to-Content Distance ──
     High distance = caption doesn't match content = manipulation signal
     Returns 0-100 (0 = perfectly aligned, 100 = completely different)
  */
  contextualGapScore(contentText, captionText) {
    if (!contentText || !captionText) return 50;

    const contentWords = new Set(
      contentText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const captionWords = new Set(
      captionText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    const intersection = new Set(
      [...contentWords].filter((w) => captionWords.has(w)),
    );
    const union = new Set([...contentWords, ...captionWords]);

    // Jaccard similarity
    const similarity = union.size === 0 ? 0 : intersection.size / union.size;

    // Invert to gap score: high similarity = low gap
    const gapScore = Math.round((1 - similarity) * 100);

    // Boosts gap if caption is much shorter (clickbait pattern)
    if (captionText.length < contentText.length * 0.1) {
      return Math.min(100, gapScore + 20);
    }

    return Math.max(0, Math.min(100, gapScore));
  }

  /* ── Claim Extraction from Known Similar Cases ──
     Extract claims/flags from top-3 similar KB entries
     Used to inject known-case context into Groq prompts
  */
  extractContextFromSimilar(queryText, topK = 3) {
    const similar = this.search(queryText, topK, 0.05);
    if (similar.length === 0) return { context: "", flags: [] };

    const allFlags = new Set();
    const caseSummaries = [];

    for (const match of similar) {
      (match.flags || []).forEach((f) => allFlags.add(f));

      caseSummaries.push({
        verdict: match.verdict,
        context:
          match.caption || match.content.slice(0, 100).replace(/\n/g, " "),
        similarity: match.similarity,
        confidence: match.confidence,
        explanation: match.explanation,
      });
    }

    const contextText = caseSummaries
      .map(
        (c, i) =>
          `[Similar case ${i + 1}] Verdict: ${c.verdict} | Confidence: ${c.confidence}% | ` +
          `"${c.context}" → ${c.explanation}`,
      )
      .join("\n");

    return {
      context: contextText,
      flags: Array.from(allFlags),
      numSimilarCases: caseSummaries.length,
      averageSimilarity: Math.round(
        (caseSummaries.reduce((s, c) => s + c.similarity, 0) /
          caseSummaries.length) *
          100,
      ),
    };
  }

  /* ── Quick Manipulation Signals Detection ──
     Returns heuristic score 0-100 for obvious red flags
     (Not ML/LLM based, purely pattern matching)
  */
  quickFlags(text, url, caption) {
    let suspicion = 0;
    const flags = [];

    // Pattern 1: Clickbait language
    const clickbaitTerms = [
      "shocking",
      "exposed",
      "secret",
      "doctors don't want",
      "you won't believe",
      "share before deleted",
      "wake up",
      "urgent",
      "exclusive",
    ];
    const clickbaitCount = clickbaitTerms.filter((t) =>
      text.toLowerCase().includes(t),
    ).length;
    if (clickbaitCount >= 2) {
      suspicion += 25;
      flags.push(`clickbait_language (${clickbaitCount} signals)`);
    }

    // Pattern 2: Excessive capitals
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.25) {
      suspicion += 15;
      flags.push(`excessive_caps (${Math.round(capsRatio * 100)}%)`);
    }

    // Pattern 3: Excessive exclamation marks
    const excRatio = (text.match(/!/g) || []).length / text.split(/\s+/).length;
    if (excRatio > 0.05) {
      suspicion += 12;
      flags.push("excessive_exclamation");
    }

    // Pattern 4: Domain reputation
    if (url && !url.startsWith("https://")) {
      suspicion += 10;
      flags.push("no_https");
    }
    if (url && url.includes("breaking") && url.includes("news")) {
      suspicion += 15;
      flags.push("suspicious_domain_pattern");
    }

    // Pattern 5: Caption-content mismatch
    if (caption && text) {
      const gap = this.contextualGapScore(text, caption);
      if (gap > 75) {
        suspicion += 20;
        flags.push(`caption_mismatch (gap ${gap}%)`);
      }
    }

    return {
      suspicion_score: Math.min(100, suspicion),
      flags,
    };
  }
}

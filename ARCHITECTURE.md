# 🎯 Katous Fi Chkara — Complete Architecture Documentation

## Executive Summary

**Katous Fi Chkara** (قطوس في شكارة) is a multilingual AI-powered fact-checking system using:

- **3-Axis Analysis** (Authenticity × Consistency × Credibility)
- **RAG-Enhanced LLM** (Retrieval-Augmented Generation with 40-entry knowledge base)
- **Hybrid ML+LLM** scoring (TF-IDF + Logistic Regression + Groq API)
- **Chain-of-Thought** reasoning with explicit 4-step analysis
- **Image Forensics** via Error Level Analysis (ELA)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     INPUT LAYER (Frontend)                              │
│  Text • Image(s) • Video • URL • Caption/Headline (multimodal)          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  STEP 1: Parse & Extract   │
                    │  • Content/caption/URL     │
                    │  • Language detection      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  STEP 2: Fetch URL Content │
                    │  • Cheerio web scraping    │
                    │  • og:meta extraction      │
                    │  • Body text cleanup       │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┴────────────────────────────┐
         │                                                       │
┌────────▼─────────────┐                        ┌──────────────▼────────┐
│  ML PRE-SCORE        │                        │  RAG SEARCH            │
│  (Python ml_service) │                        │  (vector-store.js)     │
├──────────────────────┤                        ├─────────────────────────┤
│ /predict             │                        │ Vector embedding       │
│ • TF-IDF vectorizer  │                        │ • Vocab building       │
│ • LogReg classifier  │                        │ • TF-IDF bag-of-words  │
│ • fake_prob / score  │                        │ • Cosine similarity    │
│                      │                        │                        │
│ /features            │                        │ Similarity search      │
│ • Domain scoring     │                        │ • Top-3 cases         │
│ • HTTPS check        │                        │ • Extract flags       │
│ • Clickbait heuristics
│ • Caps/exclamation   │                        │ Contextual analysis    │
└──────────┬───────────┘                        │ • Gap score (caption)  │
           │                                     │ • Quick flags         │
           │                                     │ • Manipulation signals │
           │                                     └──────────┬────────────┘
           │                                                │
           └────────────────────┬───────────────────────────┘
                                │
            ┌───────────────────▼────────────────────┐
            │  INJECT CONTEXT INTO GROQ PROMPTS      │
            │  • ML pre-score + TF-IDF results       │
            │  • RAG similar cases + patterns        │
            │  • Contextual gap score (caption fix)  │
            │  • Quick manipulation flags            │
            └───────────────────┬────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼──────┐         ┌──────▼────┐         ┌───────▼────┐
   │   AXE 1   │         │   AXE 2   │         │   AXE 3    │
   │Authenticity          │Consistency          │Credibility│
   ├───────────┤         ├───────────┤         ├────────────┤
   │ ELA       │         │ TF-IDF    │         │ Features   │
   │ Vision    │         │ CoT       │         │ Groq       │
   │ Groq      │         │ Groq      │ (RAG)   │            │
   └────┬──────┘         └───────┬───┘         └────┬───────┘
        │                        │                  │
        │ ML×40% + LLM×60%       │ ML×40% + LLM×60% │ ML×40% + LLM×60%
        │                        │                  │
        └───────────┬────────────┴──────────────────┘
                    │
            ┌───────▼────────────┐
            │  COMBINED SCORE    │
            │  Axe1×20%          │
            │ +Axe2×50%          │
            │ +Axe3×30%          │
            │ = Final 0-100      │
            └───────┬────────────┘
                    │
         ┌──────────▼──────────────┐
         │  CHAIN-OF-THOUGHT       │
         │  4-Step Reasoning       │
         │  • Claims               │
         │  • Contradictions       │
         │  • Patterns             │
         │  • Verdict (with why)   │
         └──────────┬───────────────┘
                    │
         ┌──────────▼──────────────┐
         │  FINAL UI DISPLAY       │
         │  • 3 result cards       │
         │  • Global score bar     │
         │  • ELA heatmap          │
         │  • Reasoning breakdown  │
         └───────────────────────────┘
```

---

## Component Breakdown

### 1. **Frontend (App.js)**

- **5-Step Pipeline:**
  1. Extract content/caption/URL via LLM
  2. Fetch URL via cheerio
  3. Call ML pre-score (/ml/prescore)
  4. Call RAG search (/rag) + Inject context
  5. Parallel Groq calls (3 axes)

- **Language Detection:** Regex (Arabic) + keyword matching (French/English)
- **Multimodal Support:** Text, images, video frames, captions
- **File Handling:** Base64 encoding, video frame extraction

### 2. **Backend — Node.js (server.js)**

**Endpoints:**

- `POST /analyze` — Main Groq API orchestrator
  - Injects ML context + RAG context
  - Model selection: Text (llama-3.3-70b) vs Vision (llama-4-scout-17b)
  - Timeout: 4 seconds per call

- `POST /ml/prescore` — Proxy to ML service
  - Returns: ML classifier + feature scoring

- `POST /rag` — **NEW** RAG Orchestration
  - Calls VectorStore.search() + .extractContextFromSimilar()
  - Computes contextualGapScore()
  - Returns: similarCases[], ragContext, quickFlags

- `POST /fetch-url` — Web scraping via cheerio
  - Extracts og:meta tags + body text
  - Cleans scripts/styles/ads

- `GET /ml/health` — Health check

**VectorStore Integration:**

```javascript
const vectorStore = new VectorStore(); // Initialize on startup
// In /rag endpoint:
const similarCases = vectorStore.search(query, 3);
const ragContext = vectorStore.extractContextFromSimilar(query);
const gapScore = vectorStore.contextualGapScore(content, caption);
const quickFlags = vectorStore.quickFlags(text, url, caption);
```

### 3. **Backend — Python (ml_service.py)**

**Port: 5001**

**Endpoints:**

- `POST /predict` — TF-IDF + LogReg classifier
  - Training: 80 samples (40 fake + 40 real)
  - Input: raw text
  - Output: fake_probability, real_probability, ml_verdict, ml_score (0-100), flags[]
  - Flags: clickbait_language, excessive_caps, excessive_exclamation, low_lexical_diversity

- `POST /features` — Heuristic source credibility
  - Trusted domains: Reuters, BBC, NASA, WHO, etc.
  - Suspicious patterns: breaking-news, health-secret, .info/.biz domains
  - HTTPS check
  - Output: source_score (0-100), verdict, flags[]

- `POST /ela` — **New** Error Level Analysis
  - Input: image_base64
  - JPEG recompression at 90% quality
  - Pixel-wise difference detection
  - Output: ela_score (0-100), manipulation_probability (0-1), heatmap_base64

- `GET /health` — Model status

### 4. **Knowledge Base (knowledge-base.json)**

**Structure:** 40 entries (20 fake + 20 verified)

**Fields per entry:**

```json
{
  "id": "kb_001",
  "content": "Main claim text",
  "caption": "Headline/title",
  "url": "source domain",
  "verdict": "misleading|verified|suspicious",
  "source_verdict": "suspicious|trusted",
  "authenticity_verdict": "likely_ai|authentic|manipulated",
  "confidence": 0-100,
  "flags": ["flag1", "flag2"],
  "explanation": "Why this verdict",
  "embedding": null,
  "timestamp": "ISO 8601"
}
```

**Fake Examples (kb_001-kb_020):**

- Medical misinformation (lemon cancer cure, mushroom IQ boost)
- Conspiracy theories (5G COVID, vaccine microchips, government tracking)
- Pseudoscience (UFO aliens, ancient aliens)
- Clickbait/manipulation (vague celebrity death, unsourced claims)

**Verified Examples (kb_021-kb_040):**

- NASA official announcements
- WHO health reports
- IRENA renewable energy data
- Peer-reviewed publications (Nature, Science, NEJM, The Lancet)

### 5. **RAG Engine (vector-store.js)**

**Class: VectorStore**

**Methods:**

1. **search(queryText, topK=3, minSimilarity=0.1)**
   - TF-IDF embedding of query
   - Cosine similarity against all KB entries
   - Returns top-K matches with scores

2. **contextualGapScore(content, caption)**
   - Jaccard similarity: content vs caption word overlap
   - Returns 0-100 (0=aligned, 100=mismatched)
   - **Gap interpretation:**
     - 75+: "Caption significantly mismatches content"
     - 50-75: "Moderate caption-content mismatch"
     - 0-50: "Caption aligns with content"
   - **Bonus +20** if caption << content (clickbait pattern)

3. **extractContextFromSimilar(queryText, topK=3)**
   - Calls search() for top-3 similar cases
   - Extracts all unique flags from matches
   - Formats context for prompt injection:
     ```
     [Similar case 1] Verdict: misleading | Confidence: 15% | "Claim text..." → Why it's false
     [Similar case 2] Verdict: verified | Confidence: 97% | "Claim text..." → Authority confirmation
     ```
   - Returns: context, flags[], numSimilarCases, averageSimilarity

4. **quickFlags(text, url, caption)**
   - Non-ML manipulation detection
   - Detects:
     - Clickbait signals (2+ keywords = +25 suspicion)
     - Excessive caps (>25% = +15)
     - Excessive exclamation (>5% = +12)
     - No HTTPS (= +10)
     - Suspicious domain pattern (breaking+news = +15)
     - Caption mismatch (gap>75 = +20)
   - Returns: suspicion_score (0-100), flags[]

---

## Data Flow Example: Fake Cancer Cure Claim

```
Input:
  text: "Lemon water cures cancer in 2 weeks"
  url: "https://healthtruth-secrets.info"
  caption: "The cancer cure they don't want you to know"

STEP 1: Extract → Already provided
STEP 2: Fetch URL → Scrapes content from healthtruth-secrets.info
STEP 3: ML PRE-SCORE
  • /predict → fake_probability=0.92, score=8/100, flags=[clickbait_language(3 signals)]
  • /features → source_score=22/100, verdict=suspicious, flags=[suspicious_domain_pattern, fake_tld]

STEP 4: RAG SEARCH
  • search("Lemon water cures...") → finds kb_002 (identical claim) with similarity=0.95
  • extractContextFromSimilar() →
    - [Similar case 1] Verdict: misleading | Confidence: 10% | "Lemon water cancer..." → Medical misinformation
  • contextualGapScore("...lemon water...", "cancer cure they don't want") → 32 (low gap, good match)
  • quickFlags("LEMON WATER CURES CANCER") → suspicion=42, flags=[clickbait_language, no_https]

STEP 5: INJECT CONTEXT
  ML Context: "fake_probability=92%, real_prob=8%, TF-IDF verdict=fake, flags=[clickbait]"
  RAG Context: "[Similar case 1] Verdict: misleading | Confidence: 10% | Medical misinformation"
  Gap Score: 32 (no mention)
  Quick Flags: "clickbait_language, no_https"

GROQ CALLS (Parallel):
  AXE 1 (Authenticity):
    System: "Detect AI...content recycling..." + ML context + RAG similar cases
    Groq: "verdict=likely_ai, score=12/100, flags=[medical_misinformation, manipulated]"
    Combined: 0.4×8 + 0.6×12 = 10/100

  AXE 2 (Consistency):
    System: "Fact-check claims...contradictions..." + ML context + RAG similar cases
    Groq: "verdict=misleading, confidence=92/100, flags=[unverifiable_claim, cherry_picking]"
    Combined: 0.4×8 + 0.6×92 = 58/100

  AXE 3 (Credibility):
    System: "Source analysis..." + ML domain score (22/100) + RAG context
    Groq: "verdict=suspicious, score=18/100, flags=[fake_tld, no_authority]"
    Combined: 0.4×22 + 0.6×18 = 19/100

FINAL SCORE:
  10×0.2 + 58×0.5 + 19×0.3 = 35/100 → MISLEADING ✅

CHAIN-OF-THOUGHT REASONING:
  Claims: ["Lemon water cures cancer", "In 2 weeks", "Hidden cure"]
  Contradictions: ["Medical science contradicts this", "No peer-reviewed evidence"]
  Patterns: ["Medical misinformation", "Conspiracy framing ('they don't want you to know')", "Clickbait urgency"]
  Verdict: "Demonstrably false. No medical evidence supports lemon water as cancer treatment. Similar claim found in KB marked 'misleading'."
```

---

## Scoring Formulas

### Per-Axis Score Aggregation

```
axis_score = ML_score × 0.4 + LLM_score × 0.6
```

- **ML_score** from /predict (TF-IDF) or /features (heuristics)
- **LLM_score** from Groq API response

### Global Score Aggregation

```
final_score = (Axe1_score × 0.2) + (Axe2_score × 0.5) + (Axe3_score × 0.3)
```

- **Axe 1 (Authenticity):** 20% weight
  - Detects AI generation, image manipulation, context recycling
  - Uses: ELA heatmap, vision model, Groq analysis
- **Axe 2 (Consistency):** 50% weight (highest)
  - Detects claim contradictions, logical fallacies
  - Uses: TF-IDF + Chain-of-Thought reasoning
- **Axe 3 (Credibility):** 30% weight
  - Domain reputation, writing style analysis
  - Uses: Feature heuristics + source analysis

### Verdict Mapping

```
0-29:   MISLEADING  (red, 🔴)
30-49:  SUSPICIOUS  (orange, 🟠)
50-69:  UNCERTAIN   (yellow, 🟡)
70-89:  LIKELY-TRUE (light green, 🟢)
90-100: VERIFIED    (dark green, ✅)
```

---

## Technology Stack

| Layer               | Technology                   | Role                                |
| ------------------- | ---------------------------- | ----------------------------------- |
| **Frontend**        | HTML5 + Vanilla JS + CSS3    | Chat UI, 5-step orchestration       |
| **Backend API**     | Node.js + Express            | REST API, RAG orchestration         |
| **RAG Engine**      | vector-store.js (in-memory)  | TF-IDF embedding, similarity search |
| **ML Service**      | Python 3.10+ + Flask         | TF-IDF classifier, heuristics, ELA  |
| **ML Models**       | scikit-learn                 | LogisticRegression, TfidfVectorizer |
| **Image Forensics** | PIL + numpy                  | JPEG recompression analysis         |
| **LLM**             | Groq API (llama-3.3-70b)     | Fact-checking reasoning             |
| **Vision Model**    | Groq API (llama-4-scout-17b) | Image analysis                      |
| **Web Scraping**    | cheerio                      | URL content extraction              |
| **KB Storage**      | JSON file                    | knowledge-base.json                 |

---

## How to Run

### 1. Prerequisites

```bash
# Install Node.js dependencies
cd backend
npm install

# Install Python ML service
pip install flask scikit-learn pillow numpy
```

### 2. Start Services

```bash
# Terminal 1: ML Service (Python, port 5001)
python ml_service.py

# Terminal 2: Node.js Backend (port 3000)
npm start

# Terminal 3: Frontend (open browser)
# Navigate to http://localhost:3000
```

### 3. Test RAG Endpoint

```bash
bash RAG_TEST.sh
```

---

## Testing Checklist

### RAG-Specific Tests

- [ ] `POST /rag` returns similar cases for known claims
- [ ] `contextualGapScore` detects caption-content mismatch
- [ ] `quickFlags` identifies manipulation signals
- [ ] RAG context injected into all 3 Groq calls
- [ ] Non-blocking: /rag failure doesn't block analysis

### Integration Tests

- [ ] 5-step pipeline completes in < 10 seconds
- [ ] ML pre-score + RAG context together improve verdict accuracy
- [ ] Chain-of-Thought reasoning visible in UI
- [ ] Multimodal (text + image) uses vision model

### Example Test Claims

- **Fake:** "Lemon water cures cancer" → Score 0-30 (misleading)
- **Verified:** "NASA James Webb captured deepest image" → Score 90+ (verified)
- **Suspicious:** Generic celebrity death → Score 30-50
- **Mixed signals:** Battery breakthrough claim → Score 50-70

---

## Performance Targets

| Metric                         | Target                      |
| ------------------------------ | --------------------------- |
| Step 1-2 (Extract + Fetch URL) | < 2s                        |
| Step 3 (ML pre-score + RAG)    | < 1s                        |
| Step 4 (Groq 3-axis parallel)  | < 5s                        |
| Step 5 (Score aggregation)     | < 100ms                     |
| **Total pipeline**             | **< 10 seconds**            |
| KB size                        | 40+ entries                 |
| RAG similarity search          | O(n) with cosine similarity |

---

## Future Enhancements

1. **Vector Database:** Replace in-memory with ChromaDB/Pinecone
2. **Real Training Data:** Use public fact-checking datasets (FEVER, LIAR)
3. **Image Hashing:** Add perceptual hashing for image duplicate detection
4. **Fine-tuned Models:** Train on domain-specific fact-checking data
5. **Multilingual:** Extend to Arabic/French-specific models
6. **Feedback Loop:** Learn from user corrections

---

**Built with ❤️ for Katous Fi Chkara Hackathon**

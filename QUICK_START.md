# 🚀 QUICK START GUIDE — Katous Fi Chkara

## 30 Seconds Setup

### Terminal 1: ML Service (Python)

```bash
cd c:\Users\M16\hackathon\backend
python ml_service.py
```

✅ Expected: `[ML] Ready — 80 samples | 8000 TF-IDF features`

### Terminal 2: Backend (Node.js)

```bash
cd c:\Users\M16\hackathon\backend
npm start
```

✅ Expected: `✅ Server on http://localhost:3000`

### Browser: Open Frontend

```
http://localhost:3000
```

✅ Expected: Chat interface with Katous logo + welcome message

---

## Test the System

### Test 1: Fake Claim (should score LOW 0-40)

```
Input: "Lemon water cures cancer in 2 weeks"
Expected: MISLEADING (red badge, score ~20-35)
```

### Test 2: Real Claim (should score HIGH 80+)

```
Input: "NASA James Webb Space Telescope captured the deepest infrared image"
Expected: VERIFIED (green badge, score ~85-95)
```

### Test 3: With Image

```
1. Type a claim
2. Click "Attach file"
3. Select an image
4. Submit
Expected: Uses vision model (llama-4-scout-17b) + ELA analysis
```

---

## Test RAG Endpoint

```bash
bash c:\Users\M16\hackathon\RAG_TEST.sh
```

Tests:

- `contextualGapScore` (caption-content mismatch)
- `extractContextFromSimilar` (KB case retrieval)
- `quickFlags` (manipulation detection)
- Domain searching

---

## 5-Step Pipeline in Console

Every analysis goes through:

```
[1/5] Extract signals        → Parses content/caption/URL
[2/5] Fetch URL content      → Scrapes web (if URL provided)
[3/5] ML pre-score + RAG    → TF-IDF classifier + KB search
[4/5] Running Groq AI      → 3 parallel axes analysis
[5/5] Computing combined score → Final verdict + UI
```

View in: Browser DevTools → Console

---

## Architecture at a Glance

```
FRONTEND (App.js)
    ↓
ML PRESCORE  +  RAG SEARCH
  (Python)      (vector-store.js)
    ↓
GROQ 3-AXIS ANALYSIS
  Axe1 (20%) + Axe2 (50%) + Axe3 (30%)
    ↓
FINAL VERDICT + UI
```

---

## Key Endpoints

| Endpoint       | Method | Purpose                                |
| -------------- | ------ | -------------------------------------- |
| `/analyze`     | POST   | Main Groq orchestrator (4s timeout)    |
| `/ml/prescore` | POST   | TF-IDF classifier + domain scoring     |
| `/rag`         | POST   | **NEW** RAG search + context injection |
| `/fetch-url`   | POST   | Web scraping (cheerio)                 |
| `/ml/health`   | GET    | ML service status                      |

---

## RAG Endpoint Usage

```bash
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Your claim here",
    "url": "source URL if any",
    "caption": "Headline if any"
  }'
```

Returns:

- `similarCases[]` — Top-3 matching KB entries
- `ragContext` — Formatted for prompt injection
- `contextualGapScore` — Caption-content alignment (0-100)
- `quickFlagsResult` — Heuristic manipulation signals

---

## Score Interpretation

```
0-29   🔴 MISLEADING   (False/AI-generated)
30-49  🟠 SUSPICIOUS   (Likely false with red flags)
50-69  🟡 UNCERTAIN    (Mixed signals)
70-89  🟢 LIKELY-TRUE  (Mostly verified)
90-100 ✅ VERIFIED     (Confirmed true)
```

---

## Files Structure

```
hackathon/
├── backend/
│   ├── server.js              ← Node.js API
│   ├── ml_service.py          ← Python ML (port 5001)
│   ├── vector-store.js        ← RAG Engine
│   ├── knowledge-base.json    ← KB (40 entries)
│   ├── package.json
│   └── requirements.txt
├── frontend/
│   ├── App.js                 ← 5-step pipeline
│   ├── Index.html
│   └── Style.css
├── ARCHITECTURE.md            ← Full documentation
├── README_ARCHITECTURE.md     ← Overview
├── RAG_TEST.sh               ← Test script
└── README.md
```

---

## Troubleshooting

### Error: "Cannot find module 'express'"

```bash
cd backend
npm install
```

### Error: "ml_service.py not found"

```bash
pip install flask scikit-learn pillow numpy
python ml_service.py
```

### Error: "GROQ_API_KEY not set"

Set in `.env`:

```
GROQ_API_KEY=your_key_here
```

### Slow responses (> 15 seconds)

- Check Groq API status
- Check internet connection
- Try with shorter text first

---

## Example Outputs

### Fake Claim (Lemon Water Cancer)

```json
{
  "score": 28,
  "verdict": "misleading",
  "authenticity_score": 12,
  "consistency_confidence": 92,
  "source_score": 18,
  "explanation": "Demonstrably false. No medical evidence. Similar case found in KB."
}
```

### Verified Claim (NASA James Webb)

```json
{
  "score": 93,
  "verdict": "verified",
  "authenticity_score": 95,
  "consistency_confidence": 90,
  "source_score": 92,
  "explanation": "Confirmed by NASA official channels. Authority source."
}
```

---

## Performance Benchmarks

| Step            | Duration  | Target    |
| --------------- | --------- | --------- |
| Extract + Fetch | 1-2s      | < 2s      |
| ML + RAG        | 0.5-1s    | < 1s      |
| Groq 3-axis     | 3-5s      | < 5s      |
| Score + UI      | 0.1s      | < 100ms   |
| **Total**       | **5-10s** | **< 10s** |

---

## Common Claims to Test

**Fake (expect score 0-40):**

- Lemon water cures cancer
- 5G causes COVID
- Vaccine microchips
- Moon landing hoax

**Verified (expect score 80+):**

- NASA James Webb discovered...
- WHO announced health guidelines...
- Climate change confirmed by scientists
- Renewable energy capacity increased

**Suspicious (expect score 40-60):**

- Generic celebrity death claims
- Extraordinary battery breakthrough
- New AI model announcement (without verification)

---

## Next Steps

1. **Run frontend** → http://localhost:3000
2. **Test a claim** → Watch 5-step pipeline
3. **Check console** → See [1/5], [2/5], [3/5], [4/5], [5/5]
4. **Review results** → 3 cards + global score + reasoning
5. **Try different claims** → See variance in scoring

---

## Need Help?

**Full Documentation:** `ARCHITECTURE.md`
**Test Script:** `RAG_TEST.sh`
**API Reference:** See server.js comments

---

**Ready? Start with:** `python ml_service.py` → `npm start` → http://localhost:3000

🎉 **Katous Fi Chkara v1.0 Complete**

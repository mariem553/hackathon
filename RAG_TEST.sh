#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# RAG Integration Tests — Katous Fi Chkara
# ══════════════════════════════════════════════════════════════════════════════

echo "🔍 Testing RAG /rag endpoint..."
echo ""

# Test 1: Fake news claim (cancer cure)
echo "✅ Test 1: Similar case detection — Lemon cancer cure"
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Lemon water cures cancer in 2 weeks drinking daily",
    "url": "https://healthtruth-secrets.info",
    "caption": "The cancer cure they don'\''t want you to know about"
  }' | jq '.similarCases[0], .contextualGapScore, .quickFlagsResult'

echo ""
echo "---"
echo ""

# Test 2: Caption-content mismatch (high gap score)
echo "✅ Test 2: Contextual gap detection — Caption mismatch"
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "This is a very long detailed scientific explanation about the nature of quantum mechanics and how electrons behave in different energy states according to Schrödinger equation...",
    "url": "https://example.com",
    "caption": "NASA secret"
  }' | jq '.contextualGapScore, .contextualGapInterpretation'

echo ""
echo "---"
echo ""

# Test 3: Verified claim (NASA)
echo "✅ Test 3: Know verification — NASA James Webb"
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "NASA James Webb Space Telescope deepest infrared image universe thousands of galaxies",
    "url": "https://nasa.gov",
    "caption": "NASA releases deepest infrared image of the universe"
  }' | jq '.similarCases[0], .ragContext, .average Similarity'

echo ""
echo "---"
echo ""

# Test 4: Quick flags — suspicious domain
echo "✅ Test 4: Quick flags detection — Suspicious domain + clickbait"
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SHOCKING EXPOSED Secret doctors don'\''t want you to know about this miracle cure!!!",
    "url": "http://breaking-news-now.info",
    "caption": "Share before deleted"
  }' | jq '.quickFlagsResult, .kbStats'

echo ""
echo "✅ RAG Tests Complete"

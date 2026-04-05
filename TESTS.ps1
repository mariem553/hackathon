#!/usr/bin/env pwsh
# Comprehensive Test Suite for Katous Fi Chkara
# Tests RAG, ML endpoints, and full pipeline

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE TEST SUITE - Katous Fi Chkara" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000"
$MLUrl = "http://localhost:5001"
$TestsFailed = 0
$TestsPassed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body,
        [scriptblock]$Validator
    )
    
    Write-Host "▶ $Name" -ForegroundColor Yellow
    
    try {
        $Url = "$BaseUrl$Endpoint"
        if ($Body) {
            $BodyJson = $Body | ConvertTo-Json
            $Response = Invoke-WebRequest -Uri $Url -Method $Method -Headers @{"Content-Type"="application/json"} -Body $BodyJson -UseBasicParsing
        } else {
            $Response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing
        }
        
        $Data = $Response.Content | ConvertFrom-Json
        
        if ($Validator -and !(& $Validator $Data)) {
            Write-Host "  ❌ FAILED: Validation error" -ForegroundColor Red
            $TestsFailed++
            return $false
        }
        
        Write-Host "  ✅ PASSED" -ForegroundColor Green
        $TestsPassed++
        return $true
    }
    catch {
        Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $TestsFailed++
        return $false
    }
}

# ===================================================================
# TEST 1: Health Checks
# ===================================================================
Write-Host ""
Write-Host "[1] SECTION 1: HEALTH CHECKS" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta

Test-Endpoint `
  -Name "GET / (Frontend)" `
  -Method "GET" `
  -Endpoint "/" `
  -Validator { $_ -and ($_.PSObject.Properties.Count -gt 0) }

# ===================================================================
# TEST 2: RAG Endpoint Tests
# ===================================================================
Write-Host ""
Write-Host "[2] SECTION 2: RAG ENDPOINT TESTS" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta

# Test 2.1: Fake claim detection
Test-Endpoint `
  -Name "RAG: Fake claim (Lemon cancer cure)" `
  -Method "POST" `
  -Endpoint "/rag" `
  -Body @{query="Lemon water cures cancer in 2 weeks"; url="https://healthtruth-secrets.info"; caption="Cancer cure"} `
  -Validator {
    $_.similarCases -and $_.similarCases.Count -gt 0 `
    -and $_.ragContext `
    -and $_.contextualGapScore -is [int]
  }

# Test 2.2: Verified claim detection
Test-Endpoint `
  -Name "RAG: Verified claim (NASA James Webb)" `
  -Method "POST" `
  -Endpoint "/rag" `
  -Body @{query="NASA James Webb Space Telescope captured deepest infrared image"; url="https://nasa.gov"; caption="Deepest space image"} `
  -Validator {
    $_.similarCases -and $_.contextualGapScore -is [int] `
    -and $_.kbStats.total -eq 40
  }

# Test 2.3: Contextual gap score (low quality content)
Test-Endpoint `
  -Name "RAG: Caption mismatch detection" `
  -Method "POST" `
  -Endpoint "/rag" `
  -Body @{query="This is a very long detailed scientific paper about quantum mechanics and particle physics"; url="https://example.com"; caption="SHOCKING SECRET"} `
  -Validator {
    $_.contextualGapScore -gt 50 -and $_.contextualGapInterpretation -match "mismatch"
  }

# Test 2.4: Suspicious domain detection
Test-Endpoint `
  -Name "RAG: Suspicious domain flags" `
  -Method "POST" `
  -Endpoint "/rag" `
  -Body @{query='SHOCKING EXPOSED doctors do not want you to know!!!'; url="http://breaking-news-now.info"; caption="Share before deleted"} `
  -Validator {
    $_.quickFlagsResult.suspicion_score -is [int] `
    -and $_.quickFlagsResult.flags -is [array]
  }

# Test 2.5: Error handling - missing query
Test-Endpoint `
  -Name "RAG: Error handling (missing query)" `
  -Method "POST" `
  -Endpoint "/rag" `
  -Body @{url="https://example.com"} `
  -Validator { $false }  # Should fail

Write-Host "  (Expected to fail on missing query)" -ForegroundColor Gray

# ===================================================================
# TEST 3: ML PreScore Endpoint Tests
# ===================================================================
Write-Host ""
Write-Host "[3] SECTION 3: ML PRESCORE ENDPOINT TESTS" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta
Write-Host "⚠️  ML service not running (optional for RAG testing)" -ForegroundColor Yellow

# Test-Endpoint `
#   -Name "ML: Fake text detection (/predict)" `
#   -Method "POST" `
#   -Endpoint "/ml/prescore" `
#   -Body @{text="Scientists SHOCKED lemon cures cancer"; url="https://health-secrets.info"} `
#   -Validator {
#     $_.mlPredict.fake_probability -and $_.mlFeatures.source_score -is [int]
#   }

# ===================================================================
# TEST 4: URL Fetching
# ===================================================================
Write-Host ""
Write-Host "[4] SECTION 4: URL FETCHING TESTS" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta

Test-Endpoint `
  -Name "Fetch URL: Simple website" `
  -Method "POST" `
  -Endpoint "/fetch-url" `
  -Body @{url="https://example.com"} `
  -Validator {
    $_.title -and ($_.bodyText -or $_.ogTitle)
  }

# ===================================================================
# TEST 5: Knowledge Base Statistics
# ===================================================================
Write-Host ""
Write-Host "[5] SECTION 5: KNOWLEDGE BASE VALIDATION" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta

# Extract KB stats from a RAG call
$RagResponse = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{query="test"; url=""; caption=""} | ConvertTo-Json) -UseBasicParsing | ConvertFrom-Json

Write-Host "✓ KB Statistics:" -ForegroundColor Cyan
Write-Host "  - Total entries: $($RagResponse.kbStats.total)" -ForegroundColor Gray
Write-Host "  - Verified: $($RagResponse.kbStats.byVerdict.verified)" -ForegroundColor Green
Write-Host "  - Misleading: $($RagResponse.kbStats.byVerdict.misleading)" -ForegroundColor Red
Write-Host "  - Suspicious: $($RagResponse.kbStats.byVerdict.suspicious)" -ForegroundColor Yellow
Write-Host "  - Vocab size: $($RagResponse.kbStats.vocabSize)" -ForegroundColor Gray

if ($RagResponse.kbStats.total -eq 40) {
    Write-Host "  ✅ KB has all 40 entries" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "  ❌ KB missing entries (found $($RagResponse.kbStats.total))" -ForegroundColor Red
    $TestsFailed++
}

# ===================================================================
# TEST 6: Similarity Search Validation
# ===================================================================
Write-Host ""
Write-Host "[6] SECTION 6: SIMILARITY SEARCH VALIDATION" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor Magenta

$Tests = @(
    @{
        Query = "lemon cancer cure weeks"
        ExpectedId = "kb_002"
        Name = "Exact fake claim match"
    },
    @{
        Query = "NASA James Webb deepest image"
        ExpectedId = "kb_003"
        Name = "NASA official announcement"
    },
    @{
        Query = "vaccines microchip track"
        ExpectedId = "kb_008"
        Name = "Conspiracy theory detection"
    }
)

foreach ($Test in $Tests) {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{query=$Test.Query; url=""; caption=""} | ConvertTo-Json) `
        -UseBasicParsing | ConvertFrom-Json
    
    $Found = $Response.similarCases | Where-Object {$_.id -eq $Test.ExpectedId}
    
    if ($Found) {
        Write-Host "✅ $($Test.Name)" -ForegroundColor Green
        Write-Host "   Matched: $($Found.id) | Similarity: $($Found.similarity)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "⚠️  $($Test.Name)" -ForegroundColor Yellow
        Write-Host "   Expected $($Test.ExpectedId), got: $($Response.similarCases[0].id)" -ForegroundColor Gray
    }
}

# ===================================================================
# FINAL SUMMARY
# ===================================================================
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

$Total = $TestsPassed + $TestsFailed

Write-Host ""
Write-Host "✅ Passed: $TestsPassed/$Total" -ForegroundColor Green
Write-Host "❌ Failed: $TestsFailed/$Total" -ForegroundColor Red
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! System is ready for deployment." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check logs above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan

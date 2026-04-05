#!/usr/bin/env pwsh
# Simple Test Suite for Katous Fi Chkara

Write-Host "`n===== COMPREHENSIVE TEST SUITE =====" -ForegroundColor Cyan
Write-Host "Testing RAG, ML endpoints, and full pipeline`n" -ForegroundColor Cyan

$BaseUrl = "http://localhost:3000"
$MLUrl = "http://localhost:5001"
$TestsFailed = 0
$TestsPassed = 0

# TEST 1: Health Check
Write-Host "[TEST 1] Health Check" -ForegroundColor Magenta
try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method GET -UseBasicParsing -TimeoutSec 5
    if ($Response.StatusCode -eq 200) {
        Write-Host "  PASS: Server is running (200 OK)" -ForegroundColor Green
        $TestsPassed++
    } else {
        Write-Host "  FAIL: Unexpected status code $($Response.StatusCode)" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: Cannot connect to server" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# TEST 2: RAG Endpoint - Fake Claim Detection
Write-Host "`n[TEST 2] RAG Endpoint - Fake Claim" -ForegroundColor Magenta
try {
    $Body = @{
        query = "Lemon water cures cancer in 2 weeks"
        url = "https://healthtruth-secrets.info"
        caption = "Cancer cure"
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body -UseBasicParsing -TimeoutSec 10
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.similarCases -and $Data.contextualGapScore -and $Data.kbStats.total -eq 40) {
        Write-Host "  PASS: RAG found similar cases and detected gaps" -ForegroundColor Green
        Write-Host "    - Found $($Data.similarCases.Count) similar cases" -ForegroundColor Gray
        Write-Host "    - Gap score: $($Data.contextualGapScore)" -ForegroundColor Gray
        Write-Host "    - KB entries: $($Data.kbStats.total)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  FAIL: RAG response incomplete" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: RAG endpoint error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# TEST 3: RAG Endpoint - Verified Claim
Write-Host "`n[TEST 3] RAG Endpoint - Verified Claim" -ForegroundColor Magenta
try {
    $Body = @{
        query = "NASA James Webb Space Telescope captured deepest infrared image"
        url = "https://nasa.gov"
        caption = "Deepest space image"
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body -UseBasicParsing -TimeoutSec 10
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.contextualGapScore -is [int] -and $Data.kbStats.total -eq 40) {
        Write-Host "  PASS: RAG verified claim detection working" -ForegroundColor Green
        Write-Host "    - Gap score: $($Data.contextualGapScore)" -ForegroundColor Gray
        Write-Host "    - KB total: $($Data.kbStats.total)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  FAIL: Gap score validation failed" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: Verified claim test error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# TEST 4: Caption Mismatch Detection
Write-Host "`n[TEST 4] Caption Mismatch Detection" -ForegroundColor Magenta
try {
    $Body = @{
        query = "This is a very long detailed scientific paper about quantum mechanics and particle physics and relativity"
        url = "https://example.com"
        caption = "SHOCKING SECRET"
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body -UseBasicParsing -TimeoutSec 10
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.contextualGapScore -gt 50) {
        Write-Host "  PASS: Caption mismatch detected" -ForegroundColor Green
        Write-Host "    - Gap score: $($Data.contextualGapScore) (high mismatch)" -ForegroundColor Gray
        Write-Host "    - Interpretation: $($Data.contextualGapInterpretation)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  FAIL: Gap score too low for mismatch" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: Mismatch detection error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# TEST 5: Quick Flags Detection
Write-Host "`n[TEST 5] Quick Flags Detection" -ForegroundColor Magenta
try {
    $Body = @{
        query = "SHOCKING EXPOSED doctors do not want you to know"
        url = "http://breaking-news-now.xyz"
        caption = "Share before deleted"
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body -UseBasicParsing -TimeoutSec 10
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.quickFlagsResult.suspicion_score -gt 0 -and $Data.quickFlagsResult.flags.Count -gt 0) {
        Write-Host "  PASS: Suspicious flags detected" -ForegroundColor Green
        Write-Host "    - Suspicion score: $($Data.quickFlagsResult.suspicion_score)" -ForegroundColor Gray
        Write-Host "    - Flags detected: $($Data.quickFlagsResult.flags.Count)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  FAIL: No flags detected" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: Quick flags error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# TEST 6: Knowledge Base Statistics
Write-Host "`n[TEST 6] Knowledge Base Statistics" -ForegroundColor Magenta
try {
    $Body = @{
        query = "test query for KB stats"
        url = "https://test.com"
        caption = "test"
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/rag" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body -UseBasicParsing -TimeoutSec 10
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.kbStats.total -eq 40 -and $Data.kbStats.byVerdict.misleading -gt 0 -and $Data.kbStats.vocabSize -gt 0) {
        Write-Host "  PASS: KB statistics correct" -ForegroundColor Green
        Write-Host "    - Total entries: $($Data.kbStats.total)" -ForegroundColor Gray
        Write-Host "    - Misleading: $($Data.kbStats.byVerdict.misleading)" -ForegroundColor Gray
        Write-Host "    - Verified: $($Data.kbStats.byVerdict.verified)" -ForegroundColor Gray
        Write-Host "    - Suspicious: $($Data.kbStats.byVerdict.suspicious)" -ForegroundColor Gray
        Write-Host "    - Vocab size: $($Data.kbStats.vocabSize)" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  FAIL: KB statistics incorrect" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  FAIL: KB stats error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($TestsPassed + $TestsFailed)"
Write-Host "Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Failed: $TestsFailed" -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Host "`nSUCCESS! All tests passed. System is ready." -ForegroundColor Green
} else {
    Write-Host "`nWARNING: Some tests failed. Check output above." -ForegroundColor Yellow
}

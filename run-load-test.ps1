# Quick Load Test Script for PowerShell
# Simple wrapper to run the Node.js load test

Write-Host "🚀 TechWoman Voting System - Load Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}

# Check if dev server is running
Write-Host "🔍 Checking if dev server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Dev server is running`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Dev server is not running!" -ForegroundColor Red
    Write-Host "Please start it with: yarn dev`n" -ForegroundColor Yellow
    
    $startServer = Read-Host "Would you like to start it now? (y/n)"
    if ($startServer -eq "y") {
        Write-Host "Starting dev server..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; yarn dev"
        Start-Sleep -Seconds 5
    } else {
        exit 1
    }
}

# Menu for test configuration
Write-Host "Select test intensity:" -ForegroundColor Cyan
Write-Host "1. Light   (50 votes,  5 concurrent)  - Quick test" -ForegroundColor Gray
Write-Host "2. Medium  (300 votes, 10 concurrent) - Realistic load" -ForegroundColor Gray
Write-Host "3. Heavy   (1000 votes, 50 concurrent) - Stress test" -ForegroundColor Gray
Write-Host "4. Extreme (5000 votes, 100 concurrent) - Breaking point`n" -ForegroundColor Gray

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" { 
        $totalVotes = 50
        $concurrent = 5
        $delay = 200
        Write-Host "`n🔵 Running LIGHT load test..." -ForegroundColor Blue
    }
    "2" { 
        $totalVotes = 300
        $concurrent = 10
        $delay = 100
        Write-Host "`n🟡 Running MEDIUM load test..." -ForegroundColor Yellow
    }
    "3" { 
        $totalVotes = 1000
        $concurrent = 50
        $delay = 50
        Write-Host "`n🟠 Running HEAVY load test..." -ForegroundColor DarkYellow
    }
    "4" { 
        $totalVotes = 5000
        $concurrent = 100
        $delay = 0
        Write-Host "`n🔴 Running EXTREME load test..." -ForegroundColor Red
        Write-Host "⚠️  WARNING: This may impact system performance!`n" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "Test cancelled." -ForegroundColor Gray
            exit 0
        }
    }
    default { 
        Write-Host "Invalid choice. Using Medium test." -ForegroundColor Yellow
        $totalVotes = 300
        $concurrent = 10
        $delay = 100
    }
}

# Update configuration in the script
$scriptPath = Join-Path $PSScriptRoot "load-test-voting.js"
$scriptContent = Get-Content $scriptPath -Raw

$scriptContent = $scriptContent -replace "totalVotes: \d+", "totalVotes: $totalVotes"
$scriptContent = $scriptContent -replace "concurrentBatch: \d+", "concurrentBatch: $concurrent"
$scriptContent = $scriptContent -replace "delayBetweenBatches: \d+", "delayBetweenBatches: $delay"

Set-Content $scriptPath -Value $scriptContent

Write-Host "`n⏳ Starting load test...`n" -ForegroundColor Cyan

# Run the Node.js script
node $scriptPath

Write-Host "`n✅ Load test completed!" -ForegroundColor Green
Write-Host "`n📊 Check the results above for performance metrics." -ForegroundColor Cyan
Write-Host "💡 Tip: Open http://localhost:3000/vote-result to see real-time updates`n" -ForegroundColor Gray

# Ask if user wants to view vote results
$viewResults = Read-Host "Open vote results page in browser? (y/n)"
if ($viewResults -eq "y") {
    Start-Process "http://localhost:3000/vote-result"
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

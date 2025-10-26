# Quick Load Test Script for PowerShell
# Wrapper to run Node.js load tests for voting or quizzes

Write-Host "🚀 TechWoman - Load Test Suite" -ForegroundColor Cyan
Write-Host "===============================`n" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}

# Menu for test type selection
Write-Host "Select test type:" -ForegroundColor Cyan
Write-Host "1. Voting System   - Test opinion poll voting" -ForegroundColor Gray
Write-Host "2. Quiz System     - Test quiz submissions and scoring" -ForegroundColor Gray
Write-Host "3. Both            - Run both tests sequentially`n" -ForegroundColor Gray

$testType = Read-Host "Enter your choice (1-3)"

$scriptToRun = ""
switch ($testType) {
    "1" { 
        $scriptToRun = "load-test-voting.js"
        Write-Host "`n📊 Selected: Voting System Load Test`n" -ForegroundColor Blue
    }
    "2" { 
        $scriptToRun = "load-test-quizzes.js"
        Write-Host "`n🎯 Selected: Quiz System Load Test`n" -ForegroundColor Blue
    }
    "3" { 
        $scriptToRun = "both"
        Write-Host "`n🔄 Selected: Both Tests`n" -ForegroundColor Blue
    }
    default { 
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Menu for test intensity
Write-Host "`nSelect test intensity:" -ForegroundColor Cyan
Write-Host "1. Light   (50 participants,  5 concurrent)  - Quick test" -ForegroundColor Gray
Write-Host "2. Medium  (300 participants, 10 concurrent) - Realistic load" -ForegroundColor Gray
Write-Host "3. Heavy   (1000 participants, 50 concurrent) - Stress test" -ForegroundColor Gray
Write-Host "4. Extreme (5000 participants, 100 concurrent) - Breaking point`n" -ForegroundColor Gray

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" { 
        $totalCount = 50
        $concurrent = 5
        $delay = 200
        Write-Host "`n🔵 Running LIGHT load test..." -ForegroundColor Blue
    }
    "2" { 
        $totalCount = 300
        $concurrent = 10
        $delay = 100
        Write-Host "`n🟡 Running MEDIUM load test..." -ForegroundColor Yellow
    }
    "3" { 
        $totalCount = 1000
        $concurrent = 50
        $delay = 50
        Write-Host "`n🟠 Running HEAVY load test..." -ForegroundColor DarkYellow
    }
    "4" { 
        $totalCount = 5000
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
        $totalCount = 300
        $concurrent = 10
        $delay = 100
    }
}

# Function to update script configuration
function Update-ScriptConfig {
    param (
        [string]$scriptPath,
        [int]$total,
        [int]$concurrent,
        [int]$delay
    )
    
    $scriptContent = Get-Content $scriptPath -Raw
    
    if ($scriptPath -match "voting") {
        $scriptContent = $scriptContent -replace "totalVotes: \d+", "totalVotes: $total"
    } else {
        $scriptContent = $scriptContent -replace "totalParticipants: \d+", "totalParticipants: $total"
    }
    
    $scriptContent = $scriptContent -replace "concurrentBatch: \d+", "concurrentBatch: $concurrent"
    $scriptContent = $scriptContent -replace "delayBetweenBatches: \d+", "delayBetweenBatches: $delay"
    
    Set-Content $scriptPath -Value $scriptContent
}

Write-Host "`n⏳ Starting load test...`n" -ForegroundColor Cyan

# Run the test(s)
if ($scriptToRun -eq "both") {
    # Run voting test
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "PART 1: VOTING SYSTEM TEST" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    $votingScript = Join-Path $PSScriptRoot "load-test-voting.js"
    Update-ScriptConfig -scriptPath $votingScript -total $totalCount -concurrent $concurrent -delay $delay
    node $votingScript
    
    Write-Host "`n`nPress Enter to continue to Quiz Test..." -ForegroundColor Yellow
    Read-Host
    
    # Run quiz test
    Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
    Write-Host "PART 2: QUIZ SYSTEM TEST" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    $quizScript = Join-Path $PSScriptRoot "load-test-quizzes.js"
    Update-ScriptConfig -scriptPath $quizScript -total $totalCount -concurrent $concurrent -delay $delay
    node $quizScript
} else {
    # Run single test
    $scriptPath = Join-Path $PSScriptRoot $scriptToRun
    Update-ScriptConfig -scriptPath $scriptPath -total $totalCount -concurrent $concurrent -delay $delay
    node $scriptPath
}

Write-Host "`n✅ Load test completed!" -ForegroundColor Green
Write-Host "`n📊 Check the results above for performance metrics." -ForegroundColor Cyan

if ($testType -eq "2" -or $testType -eq "3") {
    Write-Host "💡 Tip: Check http://localhost:3000/leaderboard to see quiz results`n" -ForegroundColor Gray
    
    $viewLeaderboard = Read-Host "Open leaderboard in browser? (y/n)"
    if ($viewLeaderboard -eq "y") {
        Start-Process "http://localhost:3000/leaderboard"
    }
}

if ($testType -eq "1" -or $testType -eq "3") {
    Write-Host "💡 Tip: Check http://localhost:3000/vote-result to see voting results`n" -ForegroundColor Gray
    
    $viewVotes = Read-Host "Open vote results in browser? (y/n)"
    if ($viewVotes -eq "y") {
        Start-Process "http://localhost:3000/vote-result"
    }
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

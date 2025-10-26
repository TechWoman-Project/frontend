# 🚀 Quick Start - Load Testing

## Fastest Way to Run the Test

### Option 1: PowerShell Script (Recommended for Windows)

```powershell
.\run-load-test.ps1
```

This will:

- Check if dev server is running
- Let you choose test intensity (Light/Medium/Heavy/Extreme)
- Automatically configure and run the test
- Show you the results

### Option 2: Direct Node.js Execution

```powershell
node load-test-voting.js
```

## Prerequisites Checklist

✅ Dev server running (`yarn dev`)
✅ At least one **active** opinion poll in database
✅ Environment variables configured in `.env.local`

## Test Levels

| Level       | Votes | Concurrent | Time  | Purpose                      |
| ----------- | ----- | ---------- | ----- | ---------------------------- |
| **Light**   | 50    | 5          | ~2s   | Quick functionality test     |
| **Medium**  | 300   | 10         | ~15s  | Realistic traffic simulation |
| **Heavy**   | 1000  | 50         | ~30s  | Stress test                  |
| **Extreme** | 5000  | 100        | ~2min | Breaking point test          |

## What You'll See

```
🚀 Starting Load Test for Voting System

Configuration:
  Total Votes: 300
  Concurrent Batch Size: 10
  Delay Between Batches: 100ms

📊 Fetching active opinion polls...
✅ Found quiz: "What is your favorite programming language?"
   Options (4):
     1. JavaScript
     2. Python
     3. TypeScript
     4. Go

🔄 Executing 30 batches...

Batch 1/30: Sending 10 votes... ✅ 10/10 succeeded
Batch 2/30: Sending 10 votes... ✅ 10/10 succeeded
...

============================================================
📈 LOAD TEST RESULTS
============================================================
Total Requests:        300
Successful:            298 (99.33%)
Failed:                2 (0.67%)

Total Time:            15.23s
Requests per Second:   19.70

Avg Response Time:     342.15ms
Min Response Time:     125ms
Max Response Time:     1250ms
============================================================

🎯 Performance Evaluation:
✅ GOOD - System performs well under load
```

## Watch Real-Time Updates

While the test runs, open in your browser:

- **Vote Results**: http://localhost:3000/vote-result
- **Admin Panel**: http://localhost:3000/admin

You'll see the vote counts updating in real-time! ⚡

## After Testing

The test creates real vote records. To clean up:

1. Go to Supabase SQL Editor
2. Run:

```sql
DELETE FROM votes
WHERE user_name LIKE '%Tiger%'
   OR user_name LIKE '%Eagle%'
   OR user_name LIKE '%Wolf%'
   OR user_name LIKE 'TestUser%';
```

## Troubleshooting

**"No active opinion polls found"**
→ Go to `/admin`, create an opinion poll, set status to "active"

**"Failed to fetch quizzes"**
→ Check `.env.local` has correct Supabase credentials

**High failure rate**
→ Reduce concurrent batch size or increase delay

**Dev server not running**
→ Run `yarn dev` in another terminal

## Need More Details?

See `LOAD_TEST_README.md` for comprehensive documentation.

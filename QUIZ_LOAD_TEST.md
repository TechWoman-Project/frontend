# 🚀 Quiz Load Testing - Quick Guide

## Run Quiz Load Test

### Quick Start:

```powershell
node load-test-quizzes.js
```

Or use the interactive launcher:

```powershell
.\run-load-test.ps1
```

Then select option 2 (Quiz System)

## What It Tests

✅ **Quiz Submission Performance** - Multiple users answering quizzes
✅ **Score Calculation** - Correct/incorrect answer scoring
✅ **Leaderboard Updates** - Aggregation performance
✅ **Database Writes** - Score table insertions
✅ **Concurrent Participants** - Multiple simultaneous quiz takers

## Configuration

Edit in `load-test-quizzes.js`:

```javascript
const CONFIG = {
  totalParticipants: 300, // How many users to simulate
  concurrentBatch: 10, // Concurrent users per batch
  delayBetweenBatches: 100, // ms delay between batches
  randomAnswers: true, // Random vs always correct
  correctAnswerRate: 0.7, // 70% correct when random
};
```

## Features

### Unique Usernames

Each participant gets a unique name:

- Format: `AdjectiveNoun_timestamp_id`
- Example: `BraveTiger_456789_0`
- 100% unique, no duplicates

### Smart Answer Selection

- **Random Mode** (default): 70% correct, 30% wrong
- **Perfect Mode**: Always correct
- Simulates realistic user behavior

### Complete Quiz Sessions

Each simulated user:

1. Takes ALL active quizzes
2. Answers each question
3. Gets scored immediately
4. Appears on leaderboard

## Expected Output

```
🚀 Starting Load Test for Quiz System

Configuration:
  Total Participants: 300
  Concurrent Batch Size: 10
  Random Answers: true
  Correct Answer Rate: 70%

📊 Fetching active quizzes...
✅ Found 3 active quiz(es):
   1. "What is JavaScript?"
      Options: 4, Correct: "A programming language"
   2. "What is React?"
      Options: 4, Correct: "A UI library"
   3. "What is Node.js?"
      Options: 4, Correct: "A runtime environment"

🔄 Executing 30 batches...

Batch 1/30: 10 participants... ✅ 10/10 completed successfully
Batch 2/30: 10 participants... ✅ 10/10 completed successfully
...

============================================================
📈 QUIZ LOAD TEST RESULTS
============================================================
Total Participants:    300
Successful Sessions:   298 (99.33%)
Failed Sessions:       2 (0.67%)

Total Submissions:     900 (300 participants × 3 quizzes)
Successful:            895 (99.44%)
Failed:                5 (0.56%)

Total Time:            25.50s
Participants per Sec:  11.76

Avg Response Time:     285ms
Min Response Time:     95ms
Max Response Time:     1150ms

Average Score:         210 points (out of 300)
Perfect Scores:        45 (15%)
============================================================

🎯 Performance Evaluation:
✅ EXCELLENT - Quiz system handles load very well
```

## View Results Live

While test runs:

- **Leaderboard**: http://localhost:3000/leaderboard
- **Admin Panel**: http://localhost:3000/admin

Watch the leaderboard populate in real-time! 🎯

## Cleanup Test Data

After testing, remove test participants:

```sql
-- In Supabase SQL Editor
DELETE FROM scores
WHERE user_name LIKE '%Tiger%'
   OR user_name LIKE '%Eagle%'
   OR user_name LIKE '%Wolf%'
   OR user_name LIKE '%Dolphin%'
   OR user_name LIKE '%________%';
```

## Prerequisites

✅ At least one **active** quiz with:

- Status set to "active"
- At least 2 options
- One option marked as `is_correct = true`

To create test quiz:

1. Go to http://localhost:3000/admin
2. Create a new quiz question
3. Add 4 options
4. Mark one as correct
5. Set status to "active"

## Troubleshooting

**"No active quizzes found"**
→ Create and activate a quiz in admin panel

**All answers marked wrong (0% correct)**
→ Make sure you marked the correct answer in admin: `is_correct = true`

**High failure rate**
→ Reduce `concurrentBatch` from 10 to 5

**Slow response times**
→ Add database index: `CREATE INDEX ON scores(user_name, quiz_id)`

## Comparison: Voting vs Quiz Tests

| Feature         | Voting Test      | Quiz Test                  |
| --------------- | ---------------- | -------------------------- |
| Tests           | Vote submissions | Quiz completions           |
| Scoring         | N/A              | Yes (100 pts per correct)  |
| Leaderboard     | No               | Yes                        |
| Real-time View  | vote-result page | leaderboard page           |
| Data Table      | `votes`          | `scores`                   |
| Correct Answers | N/A              | Configurable (70% default) |

## Next Steps

After successful test:

1. Check leaderboard shows top participants
2. Verify scores are calculated correctly
3. Test with different `correctAnswerRate` values
4. Run stress test with 1000+ participants
5. Clean up test data

For more details, see `LOAD_TEST_README.md`

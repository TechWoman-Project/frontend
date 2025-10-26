# Load Testing Script for Voting System

## Overview

This script performs load testing on the voting API to evaluate system performance, resilience, and identify potential bottlenecks under high traffic conditions.

## Prerequisites

- Node.js installed (v14 or higher)
- Development server running (`yarn dev`)
- At least one active opinion poll in the database
- Environment variables configured in `.env.local`

## Setup

1. **Ensure your dev server is running:**

```powershell
yarn dev
```

2. **Verify environment variables:**
   Make sure `.env.local` contains:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

3. **Create an active opinion poll:**

- Go to `http://localhost:3000/admin`
- Create an opinion poll
- Set status to "active"

## Running the Test

### Basic Usage

```powershell
node load-test-voting.js
```

### What It Tests

- **API Response Time**: Measures how fast the API responds under load
- **Success Rate**: Percentage of successful vote submissions
- **Concurrent Handling**: Tests multiple simultaneous requests
- **Database Performance**: Evaluates write operation speed
- **Error Handling**: Identifies failure patterns

## Configuration

Edit the `CONFIG` object in `load-test-voting.js`:

```javascript
const CONFIG = {
  totalVotes: 300, // Total votes to submit (default: 300)
  concurrentBatch: 10, // Concurrent requests per batch (default: 10)
  delayBetweenBatches: 100, // Delay between batches in ms (default: 100)
  randomNames: true, // Generate random usernames
  randomOptions: true, // Vote randomly across options
};
```

### Test Scenarios

**Light Load (Testing basic functionality):**

```javascript
totalVotes: 50,
concurrentBatch: 5,
delayBetweenBatches: 200,
```

**Medium Load (Realistic traffic):**

```javascript
totalVotes: 300,
concurrentBatch: 10,
delayBetweenBatches: 100,
```

**Heavy Load (Stress test):**

```javascript
totalVotes: 1000,
concurrentBatch: 50,
delayBetweenBatches: 50,
```

**Extreme Load (Breaking point test):**

```javascript
totalVotes: 5000,
concurrentBatch: 100,
delayBetweenBatches: 0,
```

## Understanding Results

### Metrics Explained

**Success Rate:**

- 99-100%: Excellent - System is very stable
- 95-99%: Good - Minor issues under load
- 90-95%: Acceptable - Shows strain
- <90%: Poor - Needs optimization

**Average Response Time:**

- <200ms: Excellent - Very fast
- 200-500ms: Good - Acceptable performance
- 500-1000ms: Acceptable - Noticeable delay
- > 1000ms: Slow - Needs optimization

**Requests per Second:**

- Indicates system throughput
- Compare with expected traffic patterns
- Higher is better

### Sample Output

```
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

Status Code Distribution:
  200: 298 (99.33%)
  500: 2 (0.67%)
============================================================
```

## Monitoring During Tests

### What to Watch

1. **Browser DevTools Console:**

   - Open `http://localhost:3000/vote-result`
   - Check real-time updates are working
   - Verify vote counts increment correctly

2. **Supabase Dashboard:**

   - Monitor database performance
   - Check for query slowdowns
   - Verify connection pool isn't exhausted

3. **Terminal Output:**
   - Watch for error patterns
   - Note any timeout messages
   - Check memory usage

## Common Issues & Solutions

### Issue: High Failure Rate

**Symptoms:** Success rate < 90%
**Possible Causes:**

- Database connection pool exhausted
- Rate limiting kicking in
- API route timeout
  **Solutions:**
- Reduce `concurrentBatch` size
- Increase `delayBetweenBatches`
- Check Supabase connection limits

### Issue: Slow Response Times

**Symptoms:** Avg response time > 1000ms
**Possible Causes:**

- Missing database indexes
- Inefficient queries
- Network latency
  **Solutions:**
- Add indexes on `quiz_id` and `option_id`
- Optimize vote aggregation queries
- Check Supabase region latency

### Issue: Script Crashes

**Symptoms:** Script exits with error
**Possible Causes:**

- No active opinion polls
- Environment variables not set
- Dev server not running
  **Solutions:**
- Create and activate an opinion poll
- Check `.env.local` configuration
- Ensure `yarn dev` is running

## Performance Benchmarks

### Expected Performance

- **Dev Environment:** 10-30 requests/second
- **Production:** 50-200 requests/second (with proper infrastructure)

### Optimization Targets

- **Response Time:** <500ms average
- **Success Rate:** >99%
- **Concurrent Handling:** 20+ simultaneous requests

## Safety Notes

⚠️ **Important Reminders:**

1. **Development Only**: This script is for testing purposes in development
2. **Database Impact**: Creates real vote records - clean up test data after
3. **Supabase Limits**: Be aware of free tier rate limits
4. **Production Warning**: Never run load tests against production without proper planning

## Cleanup After Testing

After running load tests, you may want to clean up test data:

```sql
-- Delete test votes (run in Supabase SQL Editor)
DELETE FROM votes WHERE user_name LIKE 'TestUser%' OR user_name LIKE '%Tiger%' OR user_name LIKE '%Eagle%';

-- Reset vote counts (optional)
UPDATE options SET votes_cached = 0 WHERE quiz_id = 'YOUR_TEST_QUIZ_ID';
```

## Advanced Usage

### Custom Test Script

Create your own variations by modifying the script:

```javascript
// Test specific option
const optionId = 'specific-option-id';
promises.push(submitVote(quiz.id, optionId, userName));

// Test with authentication
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer your-token',
}
```

## Questions?

- Check API route: `src/app/api/submit-vote/route.ts`
- Review vote aggregation: Database triggers and functions
- Monitor real-time updates: `src/app/vote-result/page.tsx`

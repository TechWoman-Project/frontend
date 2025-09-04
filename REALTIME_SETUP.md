# Real-time Setup Guide for TechWoman Voting System

The voting system includes real-time subscriptions, but they need to be enabled in your Supabase project.

## Steps to Enable Real-time:

### 1. Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (usually in the left sidebar)

### 2. Enable Real-time for Tables

Copy and paste this SQL command in the SQL Editor:

```sql
-- Enable real-time for voting tables
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE options;
ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;

-- Verify the tables were added
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

### 3. Check Real-time Settings

1. In your Supabase dashboard, go to Settings > API
2. Make sure "Enable real-time" is turned ON
3. Check that your tables (votes, options, quizzes) are listed under "Real-time enabled tables"

### 4. Test the Connection

1. Open the vote result page: http://localhost:3000/vote-result
2. Look for the "Real-time Test Panel" in the bottom right
3. Check if the status shows "SUBSCRIBED"
4. Click "Insert Test Vote" to test real-time updates

## What You Should See:

### Working Real-time:

- Status indicator shows "Connected" (green)
- Last update timestamp changes when new votes come in
- Vote percentages update immediately when someone votes
- Console logs show "Real-time vote INSERT" messages

### If Real-time Isn't Working:

- Status shows "Disconnected" (red)
- Results only update every 3 seconds (polling fallback)
- Console shows connection errors

## Alternative Solutions:

If real-time still doesn't work after enabling the publication:

1. **Check Network**: Some networks block WebSocket connections
2. **Browser Console**: Check for any connection errors
3. **Polling Fallback**: The system automatically polls every 3 seconds as backup
4. **Manual Refresh**: Users can refresh the page to see latest results

## Files Modified for Real-time:

- `src/app/vote-result/page.tsx` - Live results with real-time updates
- `src/app/vote/page.tsx` - Voting interface with real-time opinion list
- `src/lib/supabase.ts` - Enhanced Supabase client configuration
- `src/components/RealtimeStatus.tsx` - Connection status indicator
- `src/components/RealtimeTest.tsx` - Debug panel for testing

The system now includes both real-time subscriptions AND polling fallback to ensure results are always up-to-date!

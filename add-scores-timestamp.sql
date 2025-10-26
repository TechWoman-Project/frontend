-- Add timestamp tracking to scores table
-- This enables proper time-based ranking on the leaderboard

-- Add created_at column with default timestamp
ALTER TABLE scores 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);

-- Create composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_user_created ON scores(user_name, created_at);

-- For existing records without timestamps, set them to current time
-- (They will all have the same timestamp, but future inserts will be accurate)
UPDATE scores 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'scores' 
  AND column_name = 'created_at';

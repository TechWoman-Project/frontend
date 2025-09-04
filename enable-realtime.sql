-- Enable real-time for the tables we want to listen to
-- This needs to be run in the Supabase SQL editor

-- Add tables to the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE options;
ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;

-- Verify the publication includes our tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

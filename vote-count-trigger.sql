-- Database Trigger to Update Vote Counts Automatically
-- This trigger updates the votes_cached column in the options table
-- whenever a vote is inserted, updated, or deleted

-- Function to update vote count for an option
CREATE OR REPLACE FUNCTION update_votes_cached()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting or updating, increment the count for the new option
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE options 
    SET votes_cached = (
      SELECT COUNT(*) 
      FROM votes 
      WHERE option_id = NEW.option_id
    )
    WHERE id = NEW.option_id;
    
    -- If updating and option changed, also update the old option count
    IF (TG_OP = 'UPDATE' AND OLD.option_id IS DISTINCT FROM NEW.option_id) THEN
      UPDATE options 
      SET votes_cached = (
        SELECT COUNT(*) 
        FROM votes 
        WHERE option_id = OLD.option_id
      )
      WHERE id = OLD.option_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- If deleting, decrement the count for the old option
  IF (TG_OP = 'DELETE') THEN
    UPDATE options 
    SET votes_cached = (
      SELECT COUNT(*) 
      FROM votes 
      WHERE option_id = OLD.option_id
    )
    WHERE id = OLD.option_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on votes table
DROP TRIGGER IF EXISTS votes_update_cached_trigger ON votes;
CREATE TRIGGER votes_update_cached_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_votes_cached();

-- Optionally, run this to recalculate all existing vote counts
UPDATE options 
SET votes_cached = (
  SELECT COUNT(*) 
  FROM votes 
  WHERE votes.option_id = options.id
);

-- Verify the trigger is working
-- After running this, insert a test vote and check if votes_cached updates

/*
  # Fix Review Rating Trigger

  ## Problem
  The `update_user_rating()` function tries to update `user_profiles.rating` column which doesn't exist.
  This causes reviews creation to fail with error: column "rating" of relation "user_profiles" does not exist

  ## Solution
  1. Drop the old trigger and function that reference non-existent `rating` column
  2. Keep only the correct function `update_user_reviews_rating()` that updates existing fields:
     - `total_reviews_count`
     - `average_rating`
  3. Create a new trigger that calls the correct function

  ## Changes
  - Remove `update_user_rating_trigger` trigger
  - Remove `update_user_rating()` function
  - Ensure `update_user_reviews_rating()` function works correctly
  - Create new trigger to call `update_user_reviews_rating()`
*/

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_user_rating_trigger ON reviews;

-- Drop old function that references non-existent rating column
DROP FUNCTION IF EXISTS update_user_rating();

-- Recreate the correct function (ensure it exists and is correct)
CREATE OR REPLACE FUNCTION update_user_reviews_rating(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviews_count integer;
  avg_rating decimal(3,2);
BEGIN
  -- Count public reviews and average rating
  SELECT
    COUNT(*),
    COALESCE(AVG(rating), 0)
  INTO reviews_count, avg_rating
  FROM reviews
  WHERE reviewee_id = user_uuid
    AND is_public = true;

  -- Update user profile with correct fields
  UPDATE user_profiles
  SET
    total_reviews_count = reviews_count,
    average_rating = ROUND(avg_rating, 2)
  WHERE user_id = user_uuid;
END;
$$;

-- Create trigger function that calls update_user_reviews_rating
CREATE OR REPLACE FUNCTION trigger_update_user_reviews_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update rating for the reviewee (person being reviewed)
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_reviews_rating(OLD.reviewee_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_reviews_rating(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on reviews table
DROP TRIGGER IF EXISTS update_user_reviews_rating_trigger ON reviews;

CREATE TRIGGER update_user_reviews_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_reviews_rating();

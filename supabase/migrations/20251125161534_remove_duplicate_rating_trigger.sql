/*
  # Remove Duplicate Rating Trigger

  ## Problem
  Two triggers doing the same thing:
  - `update_reviews_rating_trigger` -> calls `trigger_update_reviews_rating()` -> calls `update_user_reviews_rating()`
  - `update_user_reviews_rating_trigger` -> calls `trigger_update_user_reviews_rating()` -> calls `update_user_reviews_rating()`
  
  Both end up calling the same function, creating duplicate updates.

  ## Solution
  Keep only one trigger and one trigger function to avoid duplication and potential conflicts.

  ## Changes
  - Remove `update_reviews_rating_trigger` and its function
  - Keep `update_user_reviews_rating_trigger` and its function
*/

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS update_reviews_rating_trigger ON reviews;

-- Drop the duplicate trigger function
DROP FUNCTION IF EXISTS trigger_update_reviews_rating();

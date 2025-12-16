/*
  # Add metrics columns to user_profiles

  1. Changes
    - Add `completed_deals_count` (integer) - count of completed deals
    - Add `total_reviews_count` (integer) - count of reviews received
    - Add `average_rating` (decimal) - average rating from reviews

  2. Notes
    - All columns have default value 0
    - These columns are used for displaying user statistics on home page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'completed_deals_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN completed_deals_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_reviews_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_reviews_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
  END IF;
END $$;
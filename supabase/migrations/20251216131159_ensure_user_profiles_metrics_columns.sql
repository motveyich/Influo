/*
  # Ensure user_profiles has metrics columns

  This migration ensures that the metrics columns exist in user_profiles table.
  Uses IF NOT EXISTS to be idempotent.
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

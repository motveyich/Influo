/*
  # Add Missing Profile Fields
  
  Adds username, bio, location, and website fields to user_profiles table
  to support full profile functionality.
  
  1. Changes
    - Add `username` column (unique, nullable)
    - Add `bio` column (text, nullable)
    - Add `location` column (text, nullable)
    - Add `website` column (text, nullable)
*/

-- Add username field (unique, nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Add bio field (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;
END $$;

-- Add location field (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location text;
  END IF;
END $$;

-- Add website field (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN website text;
  END IF;
END $$;
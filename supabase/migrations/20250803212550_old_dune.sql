/*
  # Add missing columns to user_profiles table

  1. New Columns
    - `bio` (text) - User biography/description
    - `location` (text) - User location
    - `website` (text) - User website URL
    - `avatar` (text) - User avatar image URL
    - `profile_completion` (jsonb) - Profile completion tracking
    
  2. Security
    - No additional RLS policies needed as existing policies cover these columns
    
  3. Notes
    - All columns are nullable to allow gradual profile completion
    - Uses safe IF NOT EXISTS checks to prevent errors on re-run
*/

-- Add bio column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;
END $$;

-- Add location column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location text;
  END IF;
END $$;

-- Add website column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN website text;
  END IF;
END $$;

-- Add avatar column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar text;
  END IF;
END $$;

-- Add profile_completion column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completion jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
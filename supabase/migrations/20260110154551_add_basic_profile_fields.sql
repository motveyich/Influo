/*
  # Add Basic Profile Fields to user_profiles Table

  ## Summary
  Adds missing profile fields (bio, location, website) to the user_profiles table.

  ## Changes
  
  1. **New Columns**
     - `bio` (text, nullable) - User biography/description (up to 1500 characters)
     - `location` (text, nullable) - User location/city
     - `website` (text, nullable) - User personal or company website

  ## Details
  - All fields are nullable to allow users to fill them in gradually
  - Bio field has a maximum length of 1500 characters
  - These fields complement the existing profile structure
  
  ## Security
  - No changes to RLS policies needed
  - Fields are accessible according to existing user_profiles policies
*/

-- Add bio column (user biography, up to 1500 characters)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;
END $$;

-- Add location column (user location/city)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location text;
  END IF;
END $$;

-- Add website column (user personal or company website)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN website text;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN user_profiles.bio IS 'User biography or description (max 1500 characters)';
COMMENT ON COLUMN user_profiles.location IS 'User location or city';
COMMENT ON COLUMN user_profiles.website IS 'User personal or company website URL';

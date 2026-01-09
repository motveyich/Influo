/*
  # Fix Email UNIQUE Constraint and Full Name Issues

  ## Changes
  
  1. **Email Constraint Fix**
     - Removes the global UNIQUE constraint on email column that affects all rows including soft-deleted ones
     - Creates a partial UNIQUE index on email that only applies to active profiles (WHERE is_deleted = false)
     - This allows reusing emails from deleted accounts
  
  2. **Username Unique Index**
     - Creates a partial UNIQUE index on username that only applies to active profiles
     - Prevents username conflicts while allowing reuse after account deletion
  
  3. **Full Name Data Cleanup**
     - Updates existing profiles with null full_name to use a default value
     - Extracts name from email address (part before @) for profiles with null full_name
     - Ensures all active profiles have a full_name value

  ## Security
  - No changes to RLS policies
  - Maintains data integrity while supporting soft delete functionality
  
  ## Important Notes
  - The partial indexes only enforce uniqueness on active (non-deleted) profiles
  - This prevents 409 Conflict errors when updating profiles
  - Allows email and username reuse after account deletion
*/

-- Step 1: Drop the existing UNIQUE constraint on email
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_email_key' AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_email_key;
  END IF;
END $$;

-- Step 2: Create partial UNIQUE index for email (only for active profiles)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique_active 
ON user_profiles(email) 
WHERE is_deleted = false;

-- Step 3: Create partial UNIQUE index for username (only for active profiles)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique_active 
ON user_profiles(username) 
WHERE is_deleted = false AND username IS NOT NULL;

-- Step 4: Update existing profiles with null full_name
-- Extract the part before @ from email and capitalize it as a fallback
UPDATE user_profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL AND is_deleted = false;

-- Step 5: For any remaining null full_name in deleted profiles, set to empty string
UPDATE user_profiles
SET full_name = ''
WHERE full_name IS NULL;

-- Step 6: Add a check to help prevent future null values (but keep column nullable for flexibility)
COMMENT ON COLUMN user_profiles.full_name IS 'User full name - should not be null for active profiles';

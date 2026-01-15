/*
  # Remove user_type restrictions to enable unified access

  ## Changes

  1. **Remove user_type CHECK constraint**
     - Drop the existing constraint that limits user_type to 'influencer' or 'advertiser'
     - This allows all users to have equal access to all features

  2. **Make user_type nullable**
     - Change user_type column to allow NULL values
     - For regular users, user_type can be NULL
     - Admin and moderator roles will still use user_type field

  3. **Update existing data**
     - Set user_type to NULL for all non-admin users
     - This unifies all regular users regardless of their previous type

  ## Rationale

  The platform no longer differentiates between influencer and advertiser roles.
  All users should have access to create:
  - Influencer cards
  - Advertiser cards
  - Auto campaigns
  - Offers

  The user_type field is retained only for admin/moderator roles.
*/

-- Drop the existing CHECK constraint on user_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_user_type_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_type_check;
  END IF;
END $$;

-- Make user_type column nullable
ALTER TABLE user_profiles
ALTER COLUMN user_type DROP NOT NULL;

-- Update existing users: set user_type to NULL for regular users
-- Keep admin and moderator roles intact
UPDATE user_profiles
SET user_type = NULL
WHERE user_type IN ('influencer', 'advertiser');

-- Add a new CHECK constraint that only allows NULL, admin, or moderator
-- This preserves admin functionality while removing role restrictions for regular users
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_type_check
CHECK (user_type IS NULL OR user_type IN ('admin', 'moderator'));
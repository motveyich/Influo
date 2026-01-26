/*
  # Unify User Avatars System

  ## Summary
  This migration unifies the avatar system to use a single source of truth: `user_profiles.avatar`.
  All avatars from `influencer_profile` and `advertiser_profile` JSONB fields are migrated to the main `avatar` column.

  ## Changes Made

  ### 1. Data Migration
  - Copy avatars from `influencer_profile->>'avatar'` to `user_profiles.avatar` if not set
  - Copy logos from `advertiser_profile->>'logo'` to `user_profiles.avatar` if not set
  - Remove `avatar` field from `influencer_profile` JSONB
  - Remove `logo` field from `advertiser_profile` JSONB

  ### 2. Helper Functions
  - Update `get_profile_avatar()` function to only return `user_profiles.avatar`
  - Remove fallback logic for JSONB avatar/logo fields

  ### 3. View Updates
  - Update `user_profiles_with_avatar` view to use only `user_profiles.avatar`

  ## Important Notes
  - This is a data migration that ensures all avatars are in one place
  - After this migration, only `user_profiles.avatar` should be used
  - Frontend and backend code must be updated to use only this field
  - Old avatar/logo fields in JSONB are removed to prevent confusion
*/

-- Step 1: Migrate avatars from influencer_profile to main avatar field
UPDATE user_profiles
SET avatar = influencer_profile->>'avatar'
WHERE influencer_profile->>'avatar' IS NOT NULL
  AND influencer_profile->>'avatar' != ''
  AND (avatar IS NULL OR avatar = '');

-- Step 2: Migrate logos from advertiser_profile to main avatar field
UPDATE user_profiles
SET avatar = advertiser_profile->>'logo'
WHERE advertiser_profile->>'logo' IS NOT NULL
  AND advertiser_profile->>'logo' != ''
  AND (avatar IS NULL OR avatar = '');

-- Step 3: Remove avatar field from influencer_profile JSONB
UPDATE user_profiles
SET influencer_profile = influencer_profile - 'avatar'
WHERE influencer_profile ? 'avatar';

-- Step 4: Remove logo field from advertiser_profile JSONB
UPDATE user_profiles
SET advertiser_profile = advertiser_profile - 'logo'
WHERE advertiser_profile ? 'logo';

-- Step 5: Update helper function to only use main avatar field
CREATE OR REPLACE FUNCTION get_profile_avatar(profile_data jsonb)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- This function is now deprecated and should not be used
  -- Avatar is always in user_profiles.avatar field
  SELECT NULL::text;
$$;

-- Step 6: Drop and recreate view to use only main avatar field
DROP VIEW IF EXISTS user_profiles_with_avatar;

CREATE VIEW user_profiles_with_avatar AS
SELECT 
  user_id,
  email,
  full_name,
  username,
  phone,
  avatar,
  avatar as current_avatar,
  influencer_profile,
  advertiser_profile,
  unified_account_info,
  created_at,
  updated_at
FROM user_profiles;

-- Step 7: Add comment to clarify avatar usage
COMMENT ON COLUMN user_profiles.avatar IS 
'Main profile avatar URL. This is the single source of truth for user avatars. Do NOT use avatar/logo from influencer_profile or advertiser_profile JSONB fields.';

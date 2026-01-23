/*
  # Restructure User Profiles

  ## Summary
  This migration restructures user profiles to separate general profile information from card-specific metrics.
  
  ## Changes Made

  ### 1. New Profile Structures
  - Added `influencer_profile` jsonb column for influencer-specific profile data
  - Added `advertiser_profile` jsonb column for advertiser-specific profile data
  - These columns store general information about the user, NOT specific metrics
  
  ### 2. Influencer Profile Data Structure
  The `influencer_profile` column contains:
  - `avatar` - profile picture URL
  - `nickname` - display name
  - `country` and `city` - location information
  - `contentLanguages` - array of languages the influencer creates content in
  - `bio` - short description (300-500 characters)
  - `primaryNiches` - main content categories (max 3-5)
  - `secondaryNiches` - optional additional categories
  - `audienceOverview` - generalized audience information WITHOUT specific numbers
  - `preferredBrandCategories` - categories of brands they want to work with
  - `excludedBrandCategories` - categories they won't work with
  - `openToLongTermCollabs` - boolean for long-term collaboration preference
  - `chatEnabled` - whether chat is allowed
  - `reputationData` - trust and reputation metrics
  
  ### 3. Advertiser Profile Data Structure
  The `advertiser_profile` column contains:
  - `logo` - company logo URL
  - `companyName` - official company name
  - `country` and `city` - location information
  - `website` - company website
  - `companyDescription` - about the company
  - `businessCategories` - main business categories (1-3)
  - `brandValues` - brand values and positioning
  - `typicalIntegrationTypes` - usual types of collaborations
  - `typicalBudgetRange` - optional typical budget range
  - `worksWithMicroInfluencers` - boolean
  - `paymentPolicies` - payment terms
  - `creativeFreedoAllowed` - whether influencers have creative freedom
  - `reputationData` - trust and reputation metrics

  ### 4. Indexes
  - Added GIN indexes for JSONB columns to enable efficient filtering
  - Added indexes for searching by niches and categories

  ### 5. Data Migration
  - Existing data is preserved in old columns for backward compatibility
  - New columns are optional to allow gradual migration

  ## Important Notes
  - Specific metrics (followers, engagement rate, pricing) remain ONLY in cards
  - Profile data is for general information and preferences
  - Avatar/logo from profile should be used everywhere in the system
  - RLS policies remain unchanged, operating on existing user_id
*/

-- Add new profile structure columns to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'influencer_profile'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN influencer_profile jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'advertiser_profile'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN advertiser_profile jsonb DEFAULT NULL;
  END IF;
END $$;

-- Create indexes for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_influencer_profile 
  ON user_profiles USING GIN (influencer_profile);

CREATE INDEX IF NOT EXISTS idx_user_profiles_advertiser_profile 
  ON user_profiles USING GIN (advertiser_profile);

-- Create indexes for searching by niches (influencer)
CREATE INDEX IF NOT EXISTS idx_influencer_profile_niches 
  ON user_profiles USING GIN ((influencer_profile -> 'primaryNiches'));

-- Create indexes for searching by business categories (advertiser)
CREATE INDEX IF NOT EXISTS idx_advertiser_profile_categories 
  ON user_profiles USING GIN ((advertiser_profile -> 'businessCategories'));

-- Create a helper function to extract avatar/logo from new profile structure
CREATE OR REPLACE FUNCTION get_profile_avatar(profile_data jsonb)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    profile_data->>'avatar',
    profile_data->>'logo',
    NULL
  );
END;
$$;

-- Create a view for easy access to profile with avatar
CREATE OR REPLACE VIEW user_profiles_with_avatar AS
SELECT 
  user_id,
  email,
  full_name,
  username,
  phone,
  avatar as legacy_avatar,
  COALESCE(
    get_profile_avatar(influencer_profile),
    get_profile_avatar(advertiser_profile),
    avatar
  ) as current_avatar,
  influencer_profile,
  advertiser_profile,
  unified_account_info,
  created_at,
  updated_at
FROM user_profiles;

-- Add comment describing the new structure
COMMENT ON COLUMN user_profiles.influencer_profile IS 
'Influencer profile data: avatar, bio, niches, audience overview (generalized), work preferences. Does NOT contain specific metrics (those are in influencer_cards).';

COMMENT ON COLUMN user_profiles.advertiser_profile IS 
'Advertiser profile data: logo, company info, brand values, typical collaboration preferences. Does NOT contain specific campaign details (those are in advertiser_cards).';

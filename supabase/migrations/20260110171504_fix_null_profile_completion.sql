/*
  # Fix null profile_completion values

  1. Updates
    - Updates all user_profiles with null profile_completion to have a default structure
    - Calculates basic completion data based on existing profile fields
  
  2. Changes
    - Sets default profile_completion for all profiles where it's currently null
    - Ensures all profiles have valid completion tracking
  
  3. Important Notes
    - This is a one-time migration to fix existing data
    - New profiles will automatically get profile_completion from the application
    - Completion percentage is calculated based on filled fields
*/

-- Update all profiles that have null profile_completion
UPDATE user_profiles
SET profile_completion = jsonb_build_object(
  'basicInfo', CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
      AND email IS NOT NULL AND email != ''
      AND phone IS NOT NULL AND phone != ''
      AND location IS NOT NULL AND location != ''
      AND bio IS NOT NULL AND bio != '' AND length(bio) >= 50
    THEN true 
    ELSE false 
  END,
  'influencerSetup', CASE
    WHEN influencer_data IS NOT NULL 
      AND (
        (influencer_data->>'mainSocialLink' IS NOT NULL AND influencer_data->>'mainSocialLink' != '')
        OR (influencer_data->>'category' IS NOT NULL AND influencer_data->>'category' != '')
        OR (influencer_data->>'platformName' IS NOT NULL AND influencer_data->>'platformName' != '')
        OR jsonb_array_length(COALESCE(influencer_data->'socialMediaLinks', '[]'::jsonb)) > 0
        OR (influencer_data->'metrics'->>'totalFollowers')::numeric > 0
        OR jsonb_array_length(COALESCE(influencer_data->'contentCategories', '[]'::jsonb)) > 0
      )
    THEN true
    ELSE false
  END,
  'advertiserSetup', CASE
    WHEN advertiser_data IS NOT NULL
      AND (
        (advertiser_data->>'companyName' IS NOT NULL AND advertiser_data->>'companyName' != '')
        OR (advertiser_data->>'companyWebsite' IS NOT NULL AND advertiser_data->>'companyWebsite' != '')
        OR (advertiser_data->>'companyDescription' IS NOT NULL AND advertiser_data->>'companyDescription' != '')
        OR (advertiser_data->>'industry' IS NOT NULL AND advertiser_data->>'industry' != '')
        OR (advertiser_data->'campaignPreferences'->'budgetRange'->>'min')::numeric > 0
        OR (advertiser_data->'campaignPreferences'->'budgetRange'->>'max')::numeric > 0
        OR (advertiser_data->>'previousCampaigns')::numeric > 0
        OR (advertiser_data->>'averageBudget')::numeric > 0
      )
    THEN true
    ELSE false
  END,
  'overallComplete', false,
  'completionPercentage', (
    CASE 
      WHEN full_name IS NOT NULL AND full_name != '' 
        AND email IS NOT NULL AND email != ''
        AND phone IS NOT NULL AND phone != ''
        AND location IS NOT NULL AND location != ''
        AND bio IS NOT NULL AND bio != '' AND length(bio) >= 50
      THEN 50 
      ELSE 0 
    END
    +
    CASE
      WHEN influencer_data IS NOT NULL 
        AND (
          (influencer_data->>'mainSocialLink' IS NOT NULL AND influencer_data->>'mainSocialLink' != '')
          OR (influencer_data->>'category' IS NOT NULL AND influencer_data->>'category' != '')
          OR (influencer_data->>'platformName' IS NOT NULL AND influencer_data->>'platformName' != '')
          OR jsonb_array_length(COALESCE(influencer_data->'socialMediaLinks', '[]'::jsonb)) > 0
          OR (influencer_data->'metrics'->>'totalFollowers')::numeric > 0
          OR jsonb_array_length(COALESCE(influencer_data->'contentCategories', '[]'::jsonb)) > 0
        )
      THEN 25
      ELSE 0
    END
    +
    CASE
      WHEN advertiser_data IS NOT NULL
        AND (
          (advertiser_data->>'companyName' IS NOT NULL AND advertiser_data->>'companyName' != '')
          OR (advertiser_data->>'companyWebsite' IS NOT NULL AND advertiser_data->>'companyWebsite' != '')
          OR (advertiser_data->>'companyDescription' IS NOT NULL AND advertiser_data->>'companyDescription' != '')
          OR (advertiser_data->>'industry' IS NOT NULL AND advertiser_data->>'industry' != '')
          OR (advertiser_data->'campaignPreferences'->'budgetRange'->>'min')::numeric > 0
          OR (advertiser_data->'campaignPreferences'->'budgetRange'->>'max')::numeric > 0
          OR (advertiser_data->>'previousCampaigns')::numeric > 0
          OR (advertiser_data->>'averageBudget')::numeric > 0
        )
      THEN 25
      ELSE 0
    END
  ),
  'missingFields', jsonb_build_array()
)
WHERE profile_completion IS NULL AND is_deleted = false;

-- Update overallComplete flag for profiles that are 100% complete
UPDATE user_profiles
SET profile_completion = jsonb_set(
  profile_completion,
  '{overallComplete}',
  'true'::jsonb
)
WHERE is_deleted = false
  AND (profile_completion->>'completionPercentage')::numeric = 100;

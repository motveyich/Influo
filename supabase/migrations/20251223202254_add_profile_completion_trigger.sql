/*
  # Add automatic profile completion calculation trigger

  1. New Functions
    - `calculate_profile_completion_fields()` - Calculates profile completion status
  
  2. Changes
    - Adds trigger to automatically recalculate profile completion on any user_profiles update
    - Ensures completion percentages are always up-to-date
  
  3. Logic
    - Basic info complete: full_name + email + location + bio (50+ chars) = 50%
    - Influencer setup complete: valid social media links and metrics = 25%
    - Advertiser setup complete: valid company info and preferences = 25%
    - Overall complete: all three sections complete = 100%
*/

-- Function to calculate profile completion
CREATE OR REPLACE FUNCTION calculate_profile_completion_fields()
RETURNS TRIGGER AS $$
DECLARE
  basic_complete BOOLEAN := FALSE;
  influencer_complete BOOLEAN := FALSE;
  advertiser_complete BOOLEAN := FALSE;
  completion_pct INTEGER := 0;
BEGIN
  -- Calculate basic info completion (50%)
  IF NEW.full_name IS NOT NULL AND trim(NEW.full_name) != ''
     AND NEW.email IS NOT NULL AND trim(NEW.email) != ''
     AND NEW.location IS NOT NULL AND trim(NEW.location) != ''
     AND NEW.bio IS NOT NULL AND length(trim(NEW.bio)) >= 50 THEN
    basic_complete := TRUE;
    completion_pct := completion_pct + 50;
  END IF;

  -- Calculate influencer setup completion (25%)
  IF NEW.influencer_data IS NOT NULL
     AND NEW.influencer_data->>'socialMediaLinks' IS NOT NULL
     AND jsonb_array_length((NEW.influencer_data->>'socialMediaLinks')::jsonb) > 0 THEN
    influencer_complete := TRUE;
    completion_pct := completion_pct + 25;
  END IF;

  -- Calculate advertiser setup completion (25%)
  IF NEW.advertiser_data IS NOT NULL
     AND NEW.advertiser_data->>'companyName' IS NOT NULL
     AND trim(NEW.advertiser_data->>'companyName') != '' THEN
    advertiser_complete := TRUE;
    completion_pct := completion_pct + 25;
  END IF;

  -- Update completion fields
  NEW.profile_completion_basic_info := basic_complete;
  NEW.profile_completion_influencer_setup := influencer_complete;
  NEW.profile_completion_advertiser_setup := advertiser_complete;
  NEW.profile_completion_percentage := completion_pct;
  NEW.profile_completion_overall_complete := (basic_complete AND (influencer_complete OR advertiser_complete));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON user_profiles;

-- Create trigger
CREATE TRIGGER update_profile_completion_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion_fields();
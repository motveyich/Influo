/*
  # Normalize Auto Campaigns Platform Names

  ## Description
  This migration normalizes the platform names in the auto_campaigns table
  to use lowercase format, ensuring consistency with the influencer_cards table.

  ## Changes
  - Converts all platform names to lowercase in the platforms array
  - Examples: 'Instagram' → 'instagram', 'TikTok' → 'tiktok', 'YouTube' → 'youtube'

  ## Security
  - No RLS changes required

  ## Important Notes
  This ensures that platform matching between auto_campaigns and influencer_cards
  works correctly. The issue was that auto_campaigns stored platforms with capital
  letters while influencer_cards uses lowercase, causing zero matches.
*/

-- Normalize platforms array to lowercase
UPDATE auto_campaigns
SET platforms = ARRAY(
  SELECT LOWER(unnest(platforms))
)
WHERE platforms IS NOT NULL AND array_length(platforms, 1) > 0;

-- Add comment explaining the format
COMMENT ON COLUMN auto_campaigns.platforms IS 'Platform names in lowercase: instagram, tiktok, youtube, twitter';
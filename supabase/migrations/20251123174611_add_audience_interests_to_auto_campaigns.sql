/*
  # Add Audience Interests to Auto Campaigns

  1. Changes
    - Add `target_audience_interests` column to `auto_campaigns` table
      - Type: text[] (array of text)
      - Default: empty array
      - Description: Filters influencers by their audience interests

  2. Notes
    - This field will be used to match campaigns with influencer cards
    - Influencers must have at least one matching interest to be considered
    - Uses the same interest list as influencer cards (AUDIENCE_INTERESTS constant)
*/

-- Add target_audience_interests column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_campaigns' AND column_name = 'target_audience_interests'
  ) THEN
    ALTER TABLE auto_campaigns
    ADD COLUMN target_audience_interests text[] DEFAULT '{}';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN auto_campaigns.target_audience_interests IS 'Target audience interests for filtering influencer cards';

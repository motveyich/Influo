/*
  # Make campaign_id nullable in offers table

  1. Schema Changes
    - Alter `offers` table to make `campaign_id` column nullable
    - This allows offers to be created without being linked to a specific campaign
    - Useful for offers created from influencer card applications

  2. Rationale
    - Not all offers are created from campaigns
    - Some offers are created from direct applications to influencer cards
    - Making campaign_id nullable aligns with the application's data model
*/

-- Make campaign_id nullable in offers table
DO $$
BEGIN
  -- Check if the column exists and is not nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' 
    AND column_name = 'campaign_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE offers ALTER COLUMN campaign_id DROP NOT NULL;
  END IF;
END $$;
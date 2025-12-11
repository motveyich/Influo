/*
  # Add enable_chat field to campaigns

  1. Changes
    - Add `enable_chat` boolean column to `campaigns` table with default value false
    - This allows advertisers to enable/disable direct chat contact with influencers
    
  2. Notes
    - When enable_chat is true, influencers will see a "Contact Advertiser" button
    - This provides more direct communication for automatic campaigns
*/

-- Add enable_chat column to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'enable_chat'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN enable_chat boolean DEFAULT false;
  END IF;
END $$;

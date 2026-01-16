/*
  # Add Missing Fields to Auto Campaigns

  1. New Columns
    - `target_countries` (text[]) - Target countries for campaign
    - `target_audience_interests` (text[]) - Target audience interests
    - `product_categories` (text[]) - Product categories for campaign
    - `enable_chat` (boolean) - Whether to enable chat for this campaign

  2. Changes
    - Add default empty arrays for all array fields
    - Add default true for enable_chat
*/

-- Add missing fields to auto_campaigns table
DO $$ 
BEGIN
  -- Add target_countries if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_campaigns' AND column_name = 'target_countries'
  ) THEN
    ALTER TABLE auto_campaigns 
    ADD COLUMN target_countries text[] DEFAULT '{}';
  END IF;

  -- Add target_audience_interests if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_campaigns' AND column_name = 'target_audience_interests'
  ) THEN
    ALTER TABLE auto_campaigns 
    ADD COLUMN target_audience_interests text[] DEFAULT '{}';
  END IF;

  -- Add product_categories if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_campaigns' AND column_name = 'product_categories'
  ) THEN
    ALTER TABLE auto_campaigns 
    ADD COLUMN product_categories text[] DEFAULT '{}';
  END IF;

  -- Add enable_chat if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_campaigns' AND column_name = 'enable_chat'
  ) THEN
    ALTER TABLE auto_campaigns 
    ADD COLUMN enable_chat boolean DEFAULT true;
  END IF;
END $$;
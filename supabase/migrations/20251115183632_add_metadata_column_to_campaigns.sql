/*
  # Add metadata column to campaigns table
  
  1. Changes
    - Add metadata jsonb column to campaigns table for storing automatic campaign settings
    - This allows us to store isAutomatic flag and automaticSettings
    
  2. Notes
    - Uses jsonb type for flexible storage of campaign-specific metadata
    - Default to empty object for existing campaigns
*/

-- Add metadata column to campaigns table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'campaigns' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE campaigns 
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.metadata IS 'Stores campaign-specific metadata including automatic campaign settings';

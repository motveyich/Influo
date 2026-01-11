/*
  # Add initiated_by column to offers table
  
  1. Changes
    - Add initiated_by column to offers table
    - Set default value to advertiser_id for existing records
    - Add foreign key constraint
  
  2. Purpose
    - Track who initiated each offer (advertiser or influencer)
    - Enable proper role detection on frontend for action buttons
    - Fix missing "Accept" and "Decline" buttons for receivers
*/

-- Add initiated_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE offers 
    ADD COLUMN initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Set initiated_by to advertiser_id for all existing offers
    UPDATE offers 
    SET initiated_by = advertiser_id 
    WHERE initiated_by IS NULL;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);
  END IF;
END $$;

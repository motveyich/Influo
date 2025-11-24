/*
  # Add Missing Columns to Offers Table
  
  ## Changes
  1. Add missing columns to offers table:
     - initiated_by: UUID of the user who initiated the offer
     - current_stage: Stage of collaboration (negotiation, payment, work, completion, review)
     - campaign_id: Reference to campaigns (nullable)
     - proposed_rate: Numeric proposed rate for the collaboration
     - currency: Currency code (default RUB)
  
  ## Notes
  - These columns are needed for proper offer tracking
  - Existing offers will have NULL values for new columns
*/

-- Add missing columns to offers table
DO $$ 
BEGIN
  -- Add initiated_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE offers ADD COLUMN initiated_by uuid REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);
  END IF;

  -- Add current_stage column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE offers ADD COLUMN current_stage text DEFAULT 'negotiation';
  END IF;

  -- Add campaign_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE offers ADD COLUMN campaign_id uuid;
    CREATE INDEX IF NOT EXISTS idx_offers_campaign_id ON offers(campaign_id);
  END IF;

  -- Add proposed_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'proposed_rate'
  ) THEN
    ALTER TABLE offers ADD COLUMN proposed_rate numeric(12,2);
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'currency'
  ) THEN
    ALTER TABLE offers ADD COLUMN currency text DEFAULT 'RUB';
  END IF;
END $$;
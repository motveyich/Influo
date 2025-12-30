/*
  # Add missing columns to offers table

  1. Changes
    - Add current_stage column for tracking collaboration stage
    - Add initiated_by column to track who initiated the offer
    - Add influencer_response column to track influencer's response
    - Add advertiser_response column to track advertiser's response
  
  2. Notes
    - All new columns are optional to not break existing data
    - Default values are set for backward compatibility
*/

-- Add current_stage column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE offers ADD COLUMN current_stage text DEFAULT 'negotiation';
  END IF;
END $$;

-- Add initiated_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE offers ADD COLUMN initiated_by uuid;
  END IF;
END $$;

-- Add influencer_response column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'influencer_response'
  ) THEN
    ALTER TABLE offers ADD COLUMN influencer_response text DEFAULT 'pending';
  END IF;
END $$;

-- Add advertiser_response column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'advertiser_response'
  ) THEN
    ALTER TABLE offers ADD COLUMN advertiser_response text DEFAULT 'pending';
  END IF;
END $$;

-- Add final_terms column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'final_terms'
  ) THEN
    ALTER TABLE offers ADD COLUMN final_terms jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

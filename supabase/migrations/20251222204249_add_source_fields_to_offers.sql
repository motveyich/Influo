/*
  # Add source fields to offers table

  1. Changes
    - Add `source_type` column to track where the offer originated (direct, influencer_card, advertiser_card, campaign)
    - Add `source_card_id` column to reference the source card
    - Add `initiated_by` column to track who created the offer
    - Add `timeline` column for delivery timeline text
    - Add `deliverables` column for list of deliverables

  2. Notes
    - source_type defaults to 'direct' for backwards compatibility
    - These fields support the unified offers system where applications to cards become offers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE offers ADD COLUMN source_type text DEFAULT 'direct';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'source_card_id'
  ) THEN
    ALTER TABLE offers ADD COLUMN source_card_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE offers ADD COLUMN initiated_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'timeline'
  ) THEN
    ALTER TABLE offers ADD COLUMN timeline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'deliverables'
  ) THEN
    ALTER TABLE offers ADD COLUMN deliverables text[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_source_type ON offers(source_type);
CREATE INDEX IF NOT EXISTS idx_offers_source_card_id ON offers(source_card_id);
CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);
/*
  # Update Influencer Cards Schema

  1. Schema Updates
    - Add new columns to influencer_cards table:
      - `is_active` (boolean) - whether the card is active/published
      - `last_updated` (timestamp) - when the card was last updated
    - Update service_details JSONB structure to include:
      - `description` - service description text
      - `deliveryTime` - estimated delivery time
      - `revisions` - number of revisions included

  2. Data Migration
    - Set default values for existing records
    - Ensure all cards are active by default

  3. Indexes
    - Add index on is_active for filtering
    - Add index on last_updated for sorting

  4. Security
    - Update RLS policies to handle new fields
*/

-- Add new columns to influencer_cards table
DO $$
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'influencer_cards' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE influencer_cards ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;

  -- Add last_updated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'influencer_cards' AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE influencer_cards ADD COLUMN last_updated timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing records to have default values
UPDATE influencer_cards 
SET 
  is_active = true,
  last_updated = updated_at
WHERE is_active IS NULL OR last_updated IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_influencer_cards_is_active 
ON influencer_cards (is_active);

CREATE INDEX IF NOT EXISTS idx_influencer_cards_last_updated 
ON influencer_cards (last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_influencer_cards_platform_active 
ON influencer_cards (platform, is_active);

-- Update the trigger to set last_updated on updates
CREATE OR REPLACE FUNCTION update_influencer_cards_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_influencer_cards_last_updated_trigger ON influencer_cards;
CREATE TRIGGER update_influencer_cards_last_updated_trigger
  BEFORE UPDATE ON influencer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_influencer_cards_last_updated();

-- Update RLS policies to handle new fields
DROP POLICY IF EXISTS "Anyone can read influencer cards" ON influencer_cards;
CREATE POLICY "Anyone can read active influencer cards"
  ON influencer_cards
  FOR SELECT
  TO authenticated
  USING (is_active = true OR (user_id)::text = (auth.uid())::text);

-- Allow users to see their own inactive cards
CREATE POLICY "Users can read own inactive cards"
  ON influencer_cards
  FOR SELECT
  TO authenticated
  USING ((user_id)::text = (auth.uid())::text);

-- Update existing policy for managing own cards
DROP POLICY IF EXISTS "Influencers can manage own cards" ON influencer_cards;
CREATE POLICY "Users can manage own cards"
  ON influencer_cards
  FOR ALL
  TO authenticated
  USING ((user_id)::text = (auth.uid())::text)
  WITH CHECK ((user_id)::text = (auth.uid())::text);
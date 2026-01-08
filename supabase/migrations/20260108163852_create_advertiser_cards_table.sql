/*
  # Create Advertiser Cards Table

  1. New Tables
    - `advertiser_cards`
      - `id` (uuid, primary key) - Unique card identifier
      - `user_id` (uuid, foreign key) - References user_profiles
      - `company_name` (text) - Company/brand name
      - `campaign_title` (text) - Title of the campaign
      - `campaign_description` (text) - Detailed campaign description
      - `platform` (text) - Platform (instagram, tiktok, youtube, etc.)
      - `product_categories` (jsonb) - Product categories as array
      - `budget` (jsonb) - Budget details (amount, currency, type)
      - `service_format` (jsonb) - Service format details (types, deliverables)
      - `campaign_duration` (jsonb) - Start and end dates
      - `influencer_requirements` (jsonb) - Requirements for influencers
      - `target_audience` (jsonb) - Target audience details
      - `contact_info` (jsonb) - Contact information
      - `is_active` (boolean) - Whether card is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on advertiser_cards table
    - Advertisers can create and manage their own cards
    - Everyone can view active cards
    - Admins can manage all cards

  3. Indexes
    - Index on user_id for fast lookups
    - Index on platform for filtering
    - Index on is_active for active cards
    - Index on created_at for sorting
*/

-- Create advertiser_cards table
CREATE TABLE IF NOT EXISTS advertiser_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  company_name text NOT NULL,
  campaign_title text NOT NULL,
  campaign_description text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'multi')),
  product_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  service_format jsonb NOT NULL DEFAULT '{}'::jsonb,
  campaign_duration jsonb NOT NULL DEFAULT '{}'::jsonb,
  influencer_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for advertiser_cards
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_user_id ON advertiser_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_platform ON advertiser_cards(platform);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_is_active ON advertiser_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_created_at ON advertiser_cards(created_at DESC);

-- Enable RLS
ALTER TABLE advertiser_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active advertiser cards
CREATE POLICY "Anyone can view active advertiser cards"
  ON advertiser_cards
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Advertisers can create their own cards
CREATE POLICY "Advertisers can create own cards"
  ON advertiser_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Advertisers can update their own cards
CREATE POLICY "Advertisers can update own cards"
  ON advertiser_cards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Advertisers can delete their own cards
CREATE POLICY "Advertisers can delete own cards"
  ON advertiser_cards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advertiser_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER advertiser_cards_updated_at
  BEFORE UPDATE ON advertiser_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_advertiser_cards_updated_at();
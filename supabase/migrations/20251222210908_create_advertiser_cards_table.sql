/*
  # Create Advertiser Cards Table

  ## Description
  Creates the advertiser_cards table for advertisers to showcase their collaboration opportunities.
  This table was missing from the schema but is used by the backend.

  ## New Tables

  ### advertiser_cards
  - id (uuid, primary key)
  - user_id (uuid, foreign key -> user_profiles)
  - company_name (text) - company or brand name
  - campaign_title (text) - title of the campaign/opportunity
  - campaign_description (text) - detailed description
  - platform (text) - target platform
  - product_categories (text[]) - product categories
  - budget (jsonb) - budget details with amount and currency
  - service_format (text[]) - types of content needed
  - campaign_duration (jsonb) - start and end dates
  - influencer_requirements (jsonb) - requirements for influencers
  - target_audience (jsonb) - target audience demographics
  - contact_info (jsonb) - contact information
  - is_active (boolean) - whether the card is active
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ## Security
  - Enable RLS
  - Advertisers can manage their own cards
  - Anyone authenticated can view active cards
*/

CREATE TABLE IF NOT EXISTS advertiser_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  company_name text NOT NULL,
  campaign_title text NOT NULL,
  campaign_description text,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'multi')),
  product_categories text[] DEFAULT '{}',
  budget jsonb NOT NULL DEFAULT '{}',
  service_format text[] DEFAULT '{}',
  campaign_duration jsonb NOT NULL DEFAULT '{}',
  influencer_requirements jsonb DEFAULT '{}',
  target_audience jsonb DEFAULT '{}',
  contact_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advertiser_cards_user_id ON advertiser_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_platform ON advertiser_cards(platform);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_is_active ON advertiser_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_created_at ON advertiser_cards(created_at DESC);

ALTER TABLE advertiser_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active advertiser cards"
  ON advertiser_cards
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Advertisers can view own cards"
  ON advertiser_cards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Advertisers can create own cards"
  ON advertiser_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Advertisers can update own cards"
  ON advertiser_cards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Advertisers can delete own cards"
  ON advertiser_cards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

COMMENT ON TABLE advertiser_cards IS 'Cards created by advertisers to showcase collaboration opportunities';
COMMENT ON COLUMN advertiser_cards.budget IS 'Budget details: {amount: number, currency: string}';
COMMENT ON COLUMN advertiser_cards.campaign_duration IS 'Duration: {startDate: string, endDate: string}';
COMMENT ON COLUMN advertiser_cards.influencer_requirements IS 'Requirements: {minFollowers: number, minEngagement: number, categories: string[]}';
COMMENT ON COLUMN advertiser_cards.target_audience IS 'Target audience: {ageGroups: object, genderSplit: object, countries: string[]}';

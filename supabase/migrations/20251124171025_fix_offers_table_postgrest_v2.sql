/*
  # Fix offers table for PostgREST

  1. Drop and recreate offers table
    - Ensures PostgREST sees the table correctly
    - Adds all required columns
    - Sets up proper constraints and defaults
  
  2. Security
    - Enable RLS
    - Add policies for influencers and advertisers
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS offers CASCADE;

-- Create offers table with all required columns
CREATE TABLE offers (
  offer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  influencer_card_id uuid REFERENCES influencer_cards(id) ON DELETE SET NULL,
  auto_campaign_id uuid REFERENCES auto_campaigns(id) ON DELETE SET NULL,
  campaign_id uuid,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Response tracking
  influencer_response text DEFAULT 'pending',
  advertiser_response text DEFAULT 'pending',
  current_stage text DEFAULT 'negotiation',
  
  -- Financial details
  proposed_rate numeric,
  currency text DEFAULT 'RUB',
  
  -- Core data
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  timeline jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_terms jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{"viewCount": 0}'::jsonb,
  
  -- Legacy fields
  messages text[] DEFAULT '{}',
  
  -- Review tracking
  influencer_reviewed boolean DEFAULT false,
  advertiser_reviewed boolean DEFAULT false,
  
  -- Chat settings
  enable_chat boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_offers_influencer ON offers(influencer_id);
CREATE INDEX idx_offers_advertiser ON offers(advertiser_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_auto_campaign ON offers(auto_campaign_id);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);

-- RLS Policies
CREATE POLICY "Influencers can view offers for them"
  ON offers FOR SELECT
  TO authenticated
  USING (influencer_id = auth.uid());

CREATE POLICY "Advertisers can view own offers"
  ON offers FOR SELECT
  TO authenticated
  USING (advertiser_id = auth.uid());

CREATE POLICY "Admins can read all offers"
  ON offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Influencers can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (influencer_id = auth.uid());

CREATE POLICY "Advertisers can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Users can update relevant offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  WITH CHECK (influencer_id = auth.uid() OR advertiser_id = auth.uid());

-- Grant permissions
GRANT ALL ON offers TO authenticated;
GRANT ALL ON offers TO service_role;
GRANT ALL ON offers TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

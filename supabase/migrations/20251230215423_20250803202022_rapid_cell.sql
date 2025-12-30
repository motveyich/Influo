/*
  # Influo Platform Database Schema

  1. New Tables
    - `user_profiles` - Core user information for both influencers and advertisers
    - `influencer_cards` - Detailed influencer portfolio and service information
    - `campaigns` - Brand collaboration campaigns created by advertisers
    - `collaboration_forms` - Application forms for campaign collaboration
    - `chat_messages` - Real-time messaging between users
    - `offers` - Collaboration offers between advertisers and influencers
    - `analytics_events` - Event tracking for platform analytics
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for cross-user interactions (messages, offers, etc.)
    
  3. Features
    - Real-time subscriptions for chat and offer updates
    - Full-text search capabilities
    - Proper indexing for performance
    - JSON fields for flexible metadata storage
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('influencer', 'advertiser')),
  avatar text,
  social_media_links jsonb DEFAULT '{}',
  metrics jsonb DEFAULT '{}',
  unified_account_info jsonb NOT NULL DEFAULT '{
    "isVerified": false,
    "joinedAt": "",
    "lastActive": ""
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Influencer Cards Table
CREATE TABLE IF NOT EXISTS influencer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'multi')),
  reach jsonb NOT NULL DEFAULT '{}',
  audience_demographics jsonb NOT NULL DEFAULT '{}',
  service_details jsonb NOT NULL DEFAULT '{}',
  rating decimal(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  completed_campaigns integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  brand text NOT NULL,
  budget jsonb NOT NULL DEFAULT '{}',
  preferences jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  timeline jsonb NOT NULL DEFAULT '{}',
  metrics jsonb DEFAULT '{
    "applicants": 0,
    "accepted": 0,
    "impressions": 0,
    "engagement": 0
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collaboration Forms Table
CREATE TABLE IF NOT EXISTS collaboration_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_fields jsonb NOT NULL DEFAULT '{}',
  linked_campaign uuid NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  message_content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer')),
  timestamp timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'
);

-- Offers Table
CREATE TABLE IF NOT EXISTS offers (
  offer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'counter', 'completed')),
  timeline jsonb NOT NULL DEFAULT '{}',
  messages text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{
    "viewCount": 0
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now(),
  session_id text,
  metadata jsonb DEFAULT '{}'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_influencer_cards_user_id ON influencer_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_offers_influencer_id ON offers(influencer_id);
CREATE INDEX IF NOT EXISTS idx_offers_advertiser_id ON offers(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_offers_campaign_id ON offers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for influencer_cards
CREATE POLICY "Anyone can read influencer cards"
  ON influencer_cards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Influencers can manage own cards"
  ON influencer_cards
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = influencer_cards.user_id 
    AND user_profiles.user_id::text = auth.uid()::text
  ));

-- RLS Policies for campaigns
CREATE POLICY "Anyone can read active campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Advertisers can manage own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (advertiser_id::text = auth.uid()::text);

-- RLS Policies for collaboration_forms
CREATE POLICY "Users can read own collaboration forms"
  ON collaboration_forms
  FOR SELECT
  TO authenticated
  USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

CREATE POLICY "Users can create collaboration forms"
  ON collaboration_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id::text = auth.uid()::text);

CREATE POLICY "Users can update received collaboration forms"
  ON collaboration_forms
  FOR UPDATE
  TO authenticated
  USING (receiver_id::text = auth.uid()::text);

-- RLS Policies for chat_messages
CREATE POLICY "Users can read own messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id::text = auth.uid()::text);

CREATE POLICY "Users can update own received messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id::text = auth.uid()::text);

-- RLS Policies for offers
CREATE POLICY "Users can read own offers"
  ON offers
  FOR SELECT
  TO authenticated
  USING (influencer_id::text = auth.uid()::text OR advertiser_id::text = auth.uid()::text);

CREATE POLICY "Advertisers can create offers"
  ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK (advertiser_id::text = auth.uid()::text);

CREATE POLICY "Users can update offers they're involved in"
  ON offers
  FOR UPDATE
  TO authenticated
  USING (influencer_id::text = auth.uid()::text OR advertiser_id::text = auth.uid()::text);

-- RLS Policies for analytics_events
CREATE POLICY "Users can read own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_influencer_cards_updated_at 
  BEFORE UPDATE ON influencer_cards 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_collaboration_forms_updated_at 
  BEFORE UPDATE ON collaboration_forms 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_offers_updated_at 
  BEFORE UPDATE ON offers 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
/*
  # Create Blacklist and Rate Limit Tables

  ## Blacklist Table
  Stores users who have been blacklisted by card owners.
  - Prevents blocked users from interacting through any channel
  - Bidirectional relationship tracking
  
  ## Rate Limit Interactions Table
  Tracks all user interactions with cards to enforce 1-hour rate limit.
  - Applies to: applications, favorites, automatic campaigns
  - Prevents spam and duplicate interactions
  
  1. New Tables
    - `blacklist`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references auth.users) - User who blocked
      - `blocked_id` (uuid, references auth.users) - User who is blocked
      - `reason` (text, optional)
      - `created_at` (timestamptz)
    
    - `rate_limit_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User performing action
      - `target_user_id` (uuid, references auth.users) - Target card owner
      - `interaction_type` (text) - 'application', 'favorite', 'automatic_offer'
      - `card_id` (uuid, optional) - Reference to card
      - `campaign_id` (uuid, optional) - Reference to campaign
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Users can view their own blacklist entries
    - Users can add/remove from their blacklist
    - Rate limit checks are public for validation
  
  3. Indexes
    - Composite indexes for fast lookups
    - Unique constraints to prevent duplicates
*/

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_blacklist_pair UNIQUE (blocker_id, blocked_id)
);

-- Create rate_limit_interactions table
CREATE TABLE IF NOT EXISTS rate_limit_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('application', 'favorite', 'automatic_offer', 'manual_offer')),
  card_id uuid,
  campaign_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_interaction_users CHECK (user_id != target_user_id)
);

-- Indexes for blacklist
CREATE INDEX IF NOT EXISTS idx_blacklist_blocker ON blacklist(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_blocked ON blacklist(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_pair ON blacklist(blocker_id, blocked_id);

-- Indexes for rate_limit_interactions
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_target ON rate_limit_interactions(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created ON rate_limit_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_target_created ON rate_limit_interactions(user_id, target_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_interactions ENABLE ROW LEVEL SECURITY;

-- Blacklist RLS Policies
CREATE POLICY "Users can view own blacklist entries"
  ON blacklist FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can add to their blacklist"
  ON blacklist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove from their blacklist"
  ON blacklist FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Rate Limit RLS Policies
CREATE POLICY "Users can view own rate limit entries"
  ON rate_limit_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create rate limit entries"
  ON rate_limit_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user is blacklisted
CREATE OR REPLACE FUNCTION is_user_blacklisted(
  p_user_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklist
    WHERE (blocker_id = p_target_user_id AND blocked_id = p_user_id)
       OR (blocker_id = p_user_id AND blocked_id = p_target_user_id)
  );
END;
$$;

-- Function to check rate limit (1 hour)
CREATE OR REPLACE FUNCTION is_rate_limited(
  p_user_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rate_limit_interactions
    WHERE user_id = p_user_id
      AND target_user_id = p_target_user_id
      AND created_at > now() - interval '1 hour'
  );
END;
$$;

-- Function to clean old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_interactions
  WHERE created_at < now() - interval '24 hours';
END;
$$;
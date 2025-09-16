/*
  # Create comprehensive offers system

  1. New Tables
    - `collaboration_offers` - Main offers table for collaboration requests
    - `payment_requests` - Payment windows created by influencers
    - `collaboration_reviews` - Reviews between partners after completion
    - `offer_status_history` - Track all status changes
    - `payment_status_history` - Track payment status changes

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Prevent self-applications and unauthorized actions

  3. Features
    - Role-based action restrictions
    - Payment window management
    - Review system after completion
    - Complete status tracking
    - Integration with existing chat and user systems
*/

-- Create enum types for offer system
CREATE TYPE offer_status AS ENUM (
  'pending',
  'accepted', 
  'declined',
  'in_progress',
  'completed',
  'terminated',
  'cancelled'
);

CREATE TYPE payment_request_status AS ENUM (
  'draft',
  'pending',
  'paying',
  'paid',
  'confirmed',
  'failed',
  'cancelled'
);

CREATE TYPE collaboration_stage AS ENUM (
  'pre_payment',
  'work_in_progress', 
  'post_payment',
  'completed'
);

-- Collaboration offers table
CREATE TABLE IF NOT EXISTS collaboration_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
  influencer_card_id uuid REFERENCES influencer_cards(id) ON DELETE SET NULL,
  
  -- Offer details
  title text NOT NULL,
  description text NOT NULL,
  proposed_rate numeric(10,2) NOT NULL CHECK (proposed_rate > 0),
  currency text NOT NULL DEFAULT 'USD',
  deliverables jsonb NOT NULL DEFAULT '[]',
  timeline text NOT NULL,
  
  -- Status and stages
  status offer_status NOT NULL DEFAULT 'pending',
  current_stage collaboration_stage NOT NULL DEFAULT 'pre_payment',
  
  -- Acceptance details
  accepted_at timestamptz,
  accepted_rate numeric(10,2),
  final_terms jsonb DEFAULT '{}',
  
  -- Completion details
  completed_at timestamptz,
  terminated_at timestamptz,
  termination_reason text,
  
  -- Reviews
  influencer_reviewed boolean DEFAULT false,
  advertiser_reviewed boolean DEFAULT false,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT different_users CHECK (influencer_id != advertiser_id),
  CONSTRAINT valid_accepted_rate CHECK (
    (status != 'accepted' AND accepted_rate IS NULL) OR 
    (status = 'accepted' AND accepted_rate IS NOT NULL AND accepted_rate > 0)
  )
);

-- Payment requests table (payment windows)
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES collaboration_offers(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Payment details
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type text NOT NULL CHECK (payment_type IN ('prepay', 'postpay', 'full')),
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  
  -- Payment instructions
  payment_details jsonb NOT NULL DEFAULT '{}',
  instructions text,
  
  -- Status
  status payment_request_status NOT NULL DEFAULT 'draft',
  is_frozen boolean DEFAULT false,
  
  -- Confirmation details
  confirmed_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  payment_proof jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT payment_creator_check CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND co.influencer_id = created_by
    )
  )
);

-- Collaboration reviews table
CREATE TABLE IF NOT EXISTS collaboration_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES collaboration_offers(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Review content
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text NOT NULL,
  
  -- Review metadata
  is_public boolean DEFAULT true,
  helpful_votes integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT different_reviewer_reviewee CHECK (reviewer_id != reviewee_id),
  CONSTRAINT reviewer_is_participant CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND (co.influencer_id = reviewer_id OR co.advertiser_id = reviewer_id)
    )
  ),
  CONSTRAINT reviewee_is_participant CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND (co.influencer_id = reviewee_id OR co.advertiser_id = reviewee_id)
    )
  ),
  -- One review per person per offer
  UNIQUE(offer_id, reviewer_id)
);

-- Offer status history table
CREATE TABLE IF NOT EXISTS offer_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES collaboration_offers(id) ON DELETE CASCADE,
  previous_status offer_status,
  new_status offer_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Payment status history table
CREATE TABLE IF NOT EXISTS payment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  previous_status payment_request_status,
  new_status payment_request_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_offers_influencer ON collaboration_offers(influencer_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_offers_advertiser ON collaboration_offers(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_offers_status ON collaboration_offers(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_offers_created_at ON collaboration_offers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_offer ON payment_requests(offer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

CREATE INDEX IF NOT EXISTS idx_collaboration_reviews_offer ON collaboration_reviews(offer_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_reviews_reviewer ON collaboration_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_reviews_reviewee ON collaboration_reviews(reviewee_id);

-- Enable RLS on all tables
ALTER TABLE collaboration_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_offers
CREATE POLICY "Users can create offers as influencers"
  ON collaboration_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    influencer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND user_type = 'influencer'
    )
  );

CREATE POLICY "Participants can read own offers"
  ON collaboration_offers
  FOR SELECT
  TO authenticated
  USING (influencer_id = auth.uid() OR advertiser_id = auth.uid());

CREATE POLICY "Advertisers can update received offers"
  ON collaboration_offers
  FOR UPDATE
  TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Influencers can update their own offers"
  ON collaboration_offers
  FOR UPDATE
  TO authenticated
  USING (influencer_id = auth.uid())
  WITH CHECK (influencer_id = auth.uid());

-- RLS Policies for payment_requests  
CREATE POLICY "Influencers can create payment requests"
  ON payment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND co.influencer_id = auth.uid()
    )
  );

CREATE POLICY "Offer participants can read payment requests"
  ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND (co.influencer_id = auth.uid() OR co.advertiser_id = auth.uid())
    )
  );

CREATE POLICY "Creators can update unfrozen payment requests"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND is_frozen = false)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Advertisers can confirm payment requests"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND co.advertiser_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND co.advertiser_id = auth.uid()
    )
  );

-- RLS Policies for collaboration_reviews
CREATE POLICY "Participants can create reviews"
  ON collaboration_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND (co.influencer_id = auth.uid() OR co.advertiser_id = auth.uid())
    )
  );

CREATE POLICY "Users can read public reviews"
  ON collaboration_reviews
  FOR SELECT
  TO authenticated
  USING (is_public = true OR reviewer_id = auth.uid() OR reviewee_id = auth.uid());

CREATE POLICY "Reviewers can update own reviews"
  ON collaboration_reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies for history tables
CREATE POLICY "Offer participants can read offer history"
  ON offer_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_offers co 
      WHERE co.id = offer_id AND (co.influencer_id = auth.uid() OR co.advertiser_id = auth.uid())
    )
  );

CREATE POLICY "System can insert offer history"
  ON offer_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Payment participants can read payment history"
  ON payment_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_requests pr
      JOIN collaboration_offers co ON co.id = pr.offer_id
      WHERE pr.id = payment_request_id AND (co.influencer_id = auth.uid() OR co.advertiser_id = auth.uid())
    )
  );

CREATE POLICY "System can insert payment history"
  ON payment_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_collaboration_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updates
CREATE TRIGGER update_collaboration_offers_updated_at_trigger
  BEFORE UPDATE ON collaboration_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_offers_updated_at();

CREATE TRIGGER update_payment_requests_updated_at_trigger
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();

-- Create trigger functions for status history tracking
CREATE OR REPLACE FUNCTION track_offer_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO offer_status_history (
      offer_id,
      previous_status,
      new_status,
      changed_by,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'Status changed via application',
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION track_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO payment_status_history (
      payment_request_id,
      previous_status,
      new_status,
      changed_by,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'Status changed via application',
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for status history tracking
CREATE TRIGGER track_offer_status_change_trigger
  AFTER UPDATE ON collaboration_offers
  FOR EACH ROW
  EXECUTE FUNCTION track_offer_status_change();

CREATE TRIGGER track_payment_status_change_trigger
  AFTER UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION track_payment_status_change();
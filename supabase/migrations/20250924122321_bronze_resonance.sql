/*
  Align DB schema with app services:
  - Add missing tables: payment_requests, offer_status_history, payment_status_history
  - Add review flags on offers
*/

-- Add review flags to offers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'influencer_reviewed'
  ) THEN
    ALTER TABLE offers ADD COLUMN influencer_reviewed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'advertiser_reviewed'
  ) THEN
    ALTER TABLE offers ADD COLUMN advertiser_reviewed boolean DEFAULT false;
  END IF;
END $$;

-- Create payment_requests table (used by PaymentRequestService)
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  created_by uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type text NOT NULL, -- 'prepay' | 'postpay' | 'full'
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_details jsonb NOT NULL DEFAULT '{}',
  instructions text,
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'pending' | 'paying' | 'paid' | 'confirmed' | 'failed' | 'cancelled'
  is_frozen boolean NOT NULL DEFAULT false,
  confirmed_by uuid,
  confirmed_at timestamptz,
  payment_proof jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_requests_status_check CHECK (
    status IN ('draft','pending','paying','paid','confirmed','failed','cancelled')
  )
);

-- FKs for payment_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_requests_offer_id_fkey'
  ) THEN
    ALTER TABLE payment_requests
    ADD CONSTRAINT payment_requests_offer_id_fkey
    FOREIGN KEY (offer_id) REFERENCES offers(offer_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_requests_created_by_fkey'
  ) THEN
    ALTER TABLE payment_requests
    ADD CONSTRAINT payment_requests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_requests_confirmed_by_fkey'
  ) THEN
    ALTER TABLE payment_requests
    ADD CONSTRAINT payment_requests_confirmed_by_fkey
    FOREIGN KEY (confirmed_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for payment_requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_offer_id ON payment_requests(offer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_requests_updated_at_trigger ON payment_requests;
CREATE TRIGGER update_payment_requests_updated_at_trigger
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();

-- Offer status history
CREATE TABLE IF NOT EXISTS offer_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'offer_status_history_offer_id_fkey'
  ) THEN
    ALTER TABLE offer_status_history
    ADD CONSTRAINT offer_status_history_offer_id_fkey
    FOREIGN KEY (offer_id) REFERENCES offers(offer_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'offer_status_history_changed_by_fkey'
  ) THEN
    ALTER TABLE offer_status_history
    ADD CONSTRAINT offer_status_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offer_status_history_offer_id ON offer_status_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_status_history_created_at ON offer_status_history(created_at DESC);

-- Payment status history
CREATE TABLE IF NOT EXISTS payment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_status_history_payment_request_id_fkey'
  ) THEN
    ALTER TABLE payment_status_history
    ADD CONSTRAINT payment_status_history_payment_request_id_fkey
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_status_history_changed_by_fkey'
  ) THEN
    ALTER TABLE payment_status_history
    ADD CONSTRAINT payment_status_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_status_history_payment_request_id ON payment_status_history(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_history_created_at ON payment_status_history(created_at DESC);

-- Enable RLS and add simple policies (participants only)
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_status_history ENABLE ROW LEVEL SECURITY;

-- Basic policies: allow participants to read their own records
DO $$
BEGIN
  -- payment_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_requests' AND policyname = 'Users can read own payment requests'
  ) THEN
    CREATE POLICY "Users can read own payment requests"
      ON payment_requests FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM offers o
          WHERE o.offer_id = payment_requests.offer_id
          AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_requests' AND policyname = 'Creators can manage own payment requests'
  ) THEN
    CREATE POLICY "Creators can manage own payment requests"
      ON payment_requests FOR ALL TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;

  -- offer_status_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offer_status_history' AND policyname = 'Users can read offer history'
  ) THEN
    CREATE POLICY "Users can read offer history"
      ON offer_status_history FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM offers o
          WHERE o.offer_id = offer_status_history.offer_id
          AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
        )
      );
  END IF;

  -- payment_status_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_status_history' AND policyname = 'Users can read payment history'
  ) THEN
    CREATE POLICY "Users can read payment history"
      ON payment_status_history FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM payment_requests pr
          JOIN offers o ON o.offer_id = pr.offer_id
          WHERE pr.id = payment_status_history.payment_request_id
          AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
        )
      );
  END IF;
END $$;
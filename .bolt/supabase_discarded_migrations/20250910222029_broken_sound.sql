/*
  # Create payment_windows table

  1. New Tables
    - `payment_windows`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, optional reference to deals)
      - `offer_id` (uuid, optional reference to offers)
      - `application_id` (uuid, optional reference to applications)
      - `payer_id` (uuid, who pays - advertiser)
      - `payee_id` (uuid, who receives - influencer)
      - `amount` (decimal, payment amount)
      - `currency` (text, payment currency)
      - `payment_type` (payment_type enum)
      - `payment_details` (jsonb, payment information)
      - `status` (text, payment window status)
      - `payment_stage` (text, prepay or postpay)
      - `is_editable` (boolean, can influencer edit)
      - `status_history` (jsonb, status change history)
      - `metadata` (jsonb, additional metadata)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payment_windows` table
    - Add policy for users to manage their own payment windows
    - Add policy for deal participants to read relevant payment windows
</sql>

CREATE TABLE IF NOT EXISTS payment_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES offers(offer_id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type payment_type NOT NULL DEFAULT 'full_prepay',
  payment_details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paying', 'paid', 'failed', 'confirmed', 'completed', 'cancelled')),
  payment_stage text NOT NULL DEFAULT 'prepay' CHECK (payment_stage IN ('prepay', 'postpay')),
  is_editable boolean NOT NULL DEFAULT true,
  status_history jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_windows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage payment windows for own deals"
  ON payment_windows
  FOR ALL
  TO authenticated
  USING ((payer_id = auth.uid()) OR (payee_id = auth.uid()))
  WITH CHECK ((payer_id = auth.uid()) OR (payee_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_windows_deal_id ON payment_windows(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_offer_id ON payment_windows(offer_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_application_id ON payment_windows(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_payer_id ON payment_windows(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_payee_id ON payment_windows(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_status ON payment_windows(status);
CREATE INDEX IF NOT EXISTS idx_payment_windows_created_at ON payment_windows(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_payment_windows_updated_at
  BEFORE UPDATE ON payment_windows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
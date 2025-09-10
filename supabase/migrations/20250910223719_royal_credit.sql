/*
  # Create payment_windows table

  1. New Tables
    - `payment_windows`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, nullable, foreign key to deals)
      - `offer_id` (uuid, nullable, foreign key to offers)
      - `application_id` (uuid, nullable, foreign key to applications)
      - `payer_id` (uuid, foreign key to user_profiles)
      - `payee_id` (uuid, foreign key to user_profiles)
      - `amount` (numeric)
      - `currency` (text)
      - `payment_type` (text)
      - `payment_details` (jsonb)
      - `status` (text)
      - `payment_stage` (text)
      - `is_editable` (boolean)
      - `status_history` (jsonb)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payment_windows` table
    - Add policies for users to manage own payment windows
    - Add triggers for updated_at column

  3. Indexes
    - Add indexes for performance on common queries
*/

-- Create the payment_windows table
CREATE TABLE IF NOT EXISTS payment_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid,
  offer_id uuid,
  application_id uuid,
  payer_id uuid NOT NULL,
  payee_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type text NOT NULL DEFAULT 'full_prepay',
  payment_details jsonb NOT NULL DEFAULT '{"instructions": ""}',
  status text NOT NULL DEFAULT 'pending',
  payment_stage text NOT NULL DEFAULT 'prepay',
  is_editable boolean NOT NULL DEFAULT true,
  status_history jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT payment_windows_payment_type_check CHECK (
    payment_type IN ('full_prepay', 'partial_prepay_postpay', 'postpay')
  ),
  CONSTRAINT payment_windows_status_check CHECK (
    status IN ('pending', 'paying', 'paid', 'failed', 'confirmed', 'completed', 'cancelled')
  ),
  CONSTRAINT payment_windows_payment_stage_check CHECK (
    payment_stage IN ('prepay', 'postpay')
  ),
  CONSTRAINT payment_windows_different_users CHECK (payer_id != payee_id)
);

-- Add foreign key constraints
ALTER TABLE payment_windows
ADD CONSTRAINT payment_windows_payer_id_fkey 
FOREIGN KEY (payer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE payment_windows
ADD CONSTRAINT payment_windows_payee_id_fkey 
FOREIGN KEY (payee_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Add foreign key to deals if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    ALTER TABLE payment_windows
    ADD CONSTRAINT payment_windows_deal_id_fkey 
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to offers if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
    ALTER TABLE payment_windows
    ADD CONSTRAINT payment_windows_offer_id_fkey 
    FOREIGN KEY (offer_id) REFERENCES offers(offer_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to applications if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    ALTER TABLE payment_windows
    ADD CONSTRAINT payment_windows_application_id_fkey 
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_windows_payer_id ON payment_windows(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_payee_id ON payment_windows(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_status ON payment_windows(status);
CREATE INDEX IF NOT EXISTS idx_payment_windows_created_at ON payment_windows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_windows_deal_id ON payment_windows(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_windows_offer_id ON payment_windows(offer_id) WHERE offer_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE payment_windows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own payment windows"
  ON payment_windows
  FOR ALL
  TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid())
  WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_payment_windows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_windows_updated_at_trigger
  BEFORE UPDATE ON payment_windows
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_windows_updated_at();
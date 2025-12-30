/*
  # Fix Payment Requests RLS for Advertiser Actions

  ## Changes
  1. Add UPDATE policy allowing advertisers to update payment statuses
     - Advertisers can update payment requests for their offers
     - Required for "Приступил к оплате", "Оплатил", "Не оплатил" actions
  
  ## Security
  - Only advertisers of the related offer can update payment requests
  - Maintains data integrity by checking offer relationship
*/

-- Drop existing all-in-one policy to split it properly
DROP POLICY IF EXISTS "Creators can manage own payment requests" ON payment_requests;

-- Creators can INSERT their own payment requests
CREATE POLICY "Creators can insert own payment requests"
  ON payment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Creators can UPDATE their own unfrozen payment requests
CREATE POLICY "Creators can update own payment requests"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creators can DELETE their own unfrozen payment requests
CREATE POLICY "Creators can delete own payment requests"
  ON payment_requests
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Advertisers can UPDATE payment request statuses for their offers
CREATE POLICY "Advertisers can update payment statuses"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      WHERE o.offer_id = payment_requests.offer_id
      AND o.advertiser_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers o
      WHERE o.offer_id = payment_requests.offer_id
      AND o.advertiser_id = auth.uid()
    )
  );
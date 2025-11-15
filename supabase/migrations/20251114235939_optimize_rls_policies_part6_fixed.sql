/*
  # Optimize RLS Policies - Part 6 (Fixed)
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - deals
    - reviews
    - payment_confirmations
    - payment_windows
    - user_settings
*/

-- deals policies (uses payer_id and payee_id)
DROP POLICY IF EXISTS "Users can read own deals" ON deals;
CREATE POLICY "Users can read own deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (
    (payer_id = (SELECT auth.uid())) OR 
    (payee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own deals" ON deals;
CREATE POLICY "Users can update own deals"
  ON deals
  FOR UPDATE
  TO authenticated
  USING (
    (payer_id = (SELECT auth.uid())) OR 
    (payee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create deals" ON deals;
CREATE POLICY "Users can create deals"
  ON deals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (payer_id = (SELECT auth.uid())) OR 
    (payee_id = (SELECT auth.uid()))
  );

-- reviews policies
DROP POLICY IF EXISTS "Users can read public reviews" ON reviews;
CREATE POLICY "Users can read public reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    (reviewer_id = (SELECT auth.uid())) OR 
    (reviewee_id = (SELECT auth.uid())) OR 
    (is_public = true)
  );

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = (SELECT auth.uid()));

-- payment_confirmations policies
DROP POLICY IF EXISTS "Users can read payment confirmations for own deals" ON payment_confirmations;
CREATE POLICY "Users can read payment confirmations for own deals"
  ON payment_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = payment_confirmations.deal_id
      AND (
        deals.payer_id = (SELECT auth.uid()) OR 
        deals.payee_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can create payment confirmations" ON payment_confirmations;
CREATE POLICY "Users can create payment confirmations"
  ON payment_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (confirmed_by = (SELECT auth.uid()));

-- payment_windows policies
DROP POLICY IF EXISTS "Users can manage own payment windows" ON payment_windows;
CREATE POLICY "Users can manage own payment windows"
  ON payment_windows
  FOR ALL
  TO authenticated
  USING (
    (payer_id = (SELECT auth.uid())) OR 
    (payee_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (payer_id = (SELECT auth.uid())) OR 
    (payee_id = (SELECT auth.uid()))
  );

-- user_settings policies
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all settings" ON user_settings;
CREATE POLICY "Admins can view all settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

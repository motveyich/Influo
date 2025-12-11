/*
  # Optimize RLS Policies - Part 7 (Fixed)
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - support_tickets
    - support_messages
    - payment_requests
    - offer_status_history
    - payment_status_history
*/

-- support_tickets policies
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
CREATE POLICY "Users can create own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can close own tickets" ON support_tickets;
CREATE POLICY "Users can close own tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can update tickets" ON support_tickets;
CREATE POLICY "Staff can update tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- support_messages policies
DROP POLICY IF EXISTS "Users can view messages in own tickets" ON support_messages;
CREATE POLICY "Users can view messages in own tickets"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own tickets" ON support_messages;
CREATE POLICY "Users can create messages in own tickets"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can create messages in any ticket" ON support_messages;
CREATE POLICY "Staff can create messages in any ticket"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- payment_requests policies
DROP POLICY IF EXISTS "Users can read own payment requests" ON payment_requests;
CREATE POLICY "Users can read own payment requests"
  ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.offer_id = payment_requests.offer_id
      AND (
        offers.influencer_id = (SELECT auth.uid()) OR 
        offers.advertiser_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Creators can insert own payment requests" ON payment_requests;
CREATE POLICY "Creators can insert own payment requests"
  ON payment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Creators can update own payment requests" ON payment_requests;
CREATE POLICY "Creators can update own payment requests"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Creators can delete own payment requests" ON payment_requests;
CREATE POLICY "Creators can delete own payment requests"
  ON payment_requests
  FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Advertisers can update payment statuses" ON payment_requests;
CREATE POLICY "Advertisers can update payment statuses"
  ON payment_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.offer_id = payment_requests.offer_id
      AND offers.advertiser_id = (SELECT auth.uid())
    )
  );

-- offer_status_history policies
DROP POLICY IF EXISTS "Users can read offer history" ON offer_status_history;
CREATE POLICY "Users can read offer history"
  ON offer_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.offer_id = offer_status_history.offer_id
      AND (
        offers.influencer_id = (SELECT auth.uid()) OR 
        offers.advertiser_id = (SELECT auth.uid())
      )
    )
  );

-- payment_status_history policies
DROP POLICY IF EXISTS "Users can read payment history" ON payment_status_history;
CREATE POLICY "Users can read payment history"
  ON payment_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_requests
      WHERE payment_requests.id = payment_status_history.payment_request_id
      AND EXISTS (
        SELECT 1 FROM offers
        WHERE offers.offer_id = payment_requests.offer_id
        AND (
          offers.influencer_id = (SELECT auth.uid()) OR 
          offers.advertiser_id = (SELECT auth.uid())
        )
      )
    )
  );

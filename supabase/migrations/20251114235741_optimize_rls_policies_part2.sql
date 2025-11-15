/*
  # Optimize RLS Policies - Part 2
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - offers
    - analytics_events
    - influencer_cards
    - favorites
*/

-- offers policies
DROP POLICY IF EXISTS "Users can read own offers" ON offers;
CREATE POLICY "Users can read own offers"
  ON offers
  FOR SELECT
  TO authenticated
  USING (
    ((influencer_id)::text = (SELECT auth.uid())::text) OR 
    ((advertiser_id)::text = (SELECT auth.uid())::text)
  );

DROP POLICY IF EXISTS "Advertisers can create offers" ON offers;
CREATE POLICY "Advertisers can create offers"
  ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK ((advertiser_id)::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can update offers they're involved in" ON offers;
CREATE POLICY "Users can update offers they're involved in"
  ON offers
  FOR UPDATE
  TO authenticated
  USING (
    ((influencer_id)::text = (SELECT auth.uid())::text) OR 
    ((advertiser_id)::text = (SELECT auth.uid())::text)
  );

DROP POLICY IF EXISTS "Admins can read all offers" ON offers;
CREATE POLICY "Admins can read all offers"
  ON offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- analytics_events policies
DROP POLICY IF EXISTS "Users can read own analytics events" ON analytics_events;
CREATE POLICY "Users can read own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create analytics events" ON analytics_events;
CREATE POLICY "Users can create analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- influencer_cards policies
DROP POLICY IF EXISTS "Anyone can read active influencer cards" ON influencer_cards;
CREATE POLICY "Anyone can read active influencer cards"
  ON influencer_cards
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true) AND 
    (is_deleted = false) AND 
    (user_id <> (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can read own inactive cards" ON influencer_cards;
CREATE POLICY "Users can read own inactive cards"
  ON influencer_cards
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own cards" ON influencer_cards;
CREATE POLICY "Users can manage own cards"
  ON influencer_cards
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- favorites policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

/*
  # Optimize RLS Policies - Part 8 (Final)
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - campaigns (additional policies)
    - influencer_cards (additional policies)
*/

-- campaigns additional policies
DROP POLICY IF EXISTS "Admins and moderators can manage all campaigns" ON campaigns;
CREATE POLICY "Admins and moderators can manage all campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- influencer_cards additional policies
DROP POLICY IF EXISTS "Admins and moderators can moderate all cards" ON influencer_cards;
CREATE POLICY "Admins and moderators can moderate all cards"
  ON influencer_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

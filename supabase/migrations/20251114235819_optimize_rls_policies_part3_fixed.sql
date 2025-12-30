/*
  # Optimize RLS Policies - Part 3 (Fixed)
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - applications
    - card_analytics
    - application_analytics
    - user_roles
*/

-- applications policies
DROP POLICY IF EXISTS "Users can read own applications" ON applications;
CREATE POLICY "Users can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    (applicant_id = (SELECT auth.uid())) OR 
    (target_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create applications" ON applications;
CREATE POLICY "Users can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update received applications" ON applications;
CREATE POLICY "Users can update received applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (target_id = (SELECT auth.uid()));

-- card_analytics policies
DROP POLICY IF EXISTS "Users can read own card analytics" ON card_analytics;
CREATE POLICY "Users can read own card analytics"
  ON card_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM influencer_cards
      WHERE influencer_cards.id = card_analytics.card_id
      AND influencer_cards.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own card analytics" ON card_analytics;
CREATE POLICY "Users can manage own card analytics"
  ON card_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM influencer_cards
      WHERE influencer_cards.id = card_analytics.card_id
      AND influencer_cards.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM influencer_cards
      WHERE influencer_cards.id = card_analytics.card_id
      AND influencer_cards.user_id = (SELECT auth.uid())
    )
  );

-- application_analytics policies
DROP POLICY IF EXISTS "Users can read application analytics" ON application_analytics;
CREATE POLICY "Users can read application analytics"
  ON application_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_analytics.application_id
      AND (
        applications.applicant_id = (SELECT auth.uid()) OR 
        applications.target_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage application analytics" ON application_analytics;
CREATE POLICY "Users can manage application analytics"
  ON application_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_analytics.application_id
      AND (
        applications.applicant_id = (SELECT auth.uid()) OR 
        applications.target_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_analytics.application_id
      AND (
        applications.applicant_id = (SELECT auth.uid()) OR 
        applications.target_id = (SELECT auth.uid())
      )
    )
  );

-- user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (get_user_role((SELECT auth.uid())) = 'admin'::user_role)
  WITH CHECK (get_user_role((SELECT auth.uid())) = 'admin'::user_role);

/*
  # Optimize RLS Policies - Part 4
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - content_reports
    - moderation_queue
    - admin_logs
    - content_filters
*/

-- content_reports policies
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own reports" ON content_reports;
CREATE POLICY "Users can read own reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Moderators can read all reports" ON content_reports;
CREATE POLICY "Moderators can read all reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Moderators can update reports" ON content_reports;
CREATE POLICY "Moderators can update reports"
  ON content_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- moderation_queue policies
DROP POLICY IF EXISTS "Moderators can manage moderation queue" ON moderation_queue;
CREATE POLICY "Moderators can manage moderation queue"
  ON moderation_queue
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

DROP POLICY IF EXISTS "Admins and moderators can read moderation queue" ON moderation_queue;
CREATE POLICY "Admins and moderators can read moderation queue"
  ON moderation_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins and moderators can update moderation queue" ON moderation_queue;
CREATE POLICY "Admins and moderators can update moderation queue"
  ON moderation_queue
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- admin_logs policies
DROP POLICY IF EXISTS "Admins can read all logs" ON admin_logs;
CREATE POLICY "Admins can read all logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- content_filters policies
DROP POLICY IF EXISTS "Moderators can manage content filters" ON content_filters;
CREATE POLICY "Moderators can manage content filters"
  ON content_filters
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

/*
  # Optimize RLS Policies - Part 1
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    - This prevents re-evaluation for each row and significantly improves performance
    
  2. Tables Optimized
    - user_profiles
    - campaigns
    - collaboration_forms
    - chat_messages
*/

-- user_profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "admin_can_update_own_profile" ON user_profiles;
CREATE POLICY "admin_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE (up.user_id = (SELECT auth.uid())) 
        AND (up.role = 'admin'::user_role) 
        AND (up.is_deleted = false)
    ))
  );

DROP POLICY IF EXISTS "admin_moderator_can_block_users" ON user_profiles;
CREATE POLICY "admin_moderator_can_block_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (user_id <> (SELECT auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE (up.user_id = (SELECT auth.uid())) 
        AND (up.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])) 
        AND (up.is_deleted = false)
    ))
  );

-- campaigns policies
DROP POLICY IF EXISTS "Advertisers can manage own campaigns" ON campaigns;
CREATE POLICY "Advertisers can manage own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (advertiser_id = (SELECT auth.uid()))
  WITH CHECK (advertiser_id = (SELECT auth.uid()));

-- collaboration_forms policies
DROP POLICY IF EXISTS "Users can read own collaboration forms" ON collaboration_forms;
CREATE POLICY "Users can read own collaboration forms"
  ON collaboration_forms
  FOR SELECT
  TO authenticated
  USING (
    (sender_id = (SELECT auth.uid())) OR 
    (receiver_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create collaboration forms" ON collaboration_forms;
CREATE POLICY "Users can create collaboration forms"
  ON collaboration_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update received collaboration forms" ON collaboration_forms;
CREATE POLICY "Users can update received collaboration forms"
  ON collaboration_forms
  FOR UPDATE
  TO authenticated
  USING (receiver_id = (SELECT auth.uid()));

-- chat_messages policies
DROP POLICY IF EXISTS "Users can read own messages" ON chat_messages;
CREATE POLICY "Users can read own messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    ((sender_id)::text = (SELECT auth.uid())::text) OR 
    ((receiver_id)::text = (SELECT auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((sender_id)::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own received messages" ON chat_messages;
CREATE POLICY "Users can update own received messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING ((receiver_id)::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Admins can read all messages" ON chat_messages;
CREATE POLICY "Admins can read all messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

/*
  # Optimize RLS Policies - Part 5
  
  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    
  2. Tables Optimized
    - platform_updates
    - platform_events
    - platform_news
    - ai_chat_threads
    - ai_chat_messages
*/

-- platform_updates policies
DROP POLICY IF EXISTS "Moderators can manage updates" ON platform_updates;
CREATE POLICY "Moderators can manage updates"
  ON platform_updates
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

-- platform_events policies
DROP POLICY IF EXISTS "Moderators can manage events" ON platform_events;
CREATE POLICY "Moderators can manage events"
  ON platform_events
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

-- platform_news policies
DROP POLICY IF EXISTS "Moderators can manage news" ON platform_news;
CREATE POLICY "Moderators can manage news"
  ON platform_news
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

-- ai_chat_threads policies
DROP POLICY IF EXISTS "Users can access own conversation threads" ON ai_chat_threads;
CREATE POLICY "Users can access own conversation threads"
  ON ai_chat_threads
  FOR ALL
  TO authenticated
  USING (
    (user1_id = (SELECT auth.uid())) OR 
    (user2_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (user1_id = (SELECT auth.uid())) OR 
    (user2_id = (SELECT auth.uid()))
  );

-- ai_chat_messages policies
DROP POLICY IF EXISTS "Users can access messages from own threads" ON ai_chat_messages;
CREATE POLICY "Users can access messages from own threads"
  ON ai_chat_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_threads
      WHERE ai_chat_threads.id = ai_chat_messages.thread_id
      AND (
        ai_chat_threads.user1_id = (SELECT auth.uid()) OR 
        ai_chat_threads.user2_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_threads
      WHERE ai_chat_threads.id = ai_chat_messages.thread_id
      AND (
        ai_chat_threads.user1_id = (SELECT auth.uid()) OR 
        ai_chat_threads.user2_id = (SELECT auth.uid())
      )
    )
  );

/*
  # AI Chat Assistant Integration

  1. New Tables
    - `ai_chat_threads`
      - `id` (uuid, primary key)
      - `conversation_id` (text, unique identifier for user conversation)
      - `user1_id` (uuid, first participant)
      - `user2_id` (uuid, second participant)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ai_chat_messages`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, foreign key to ai_chat_threads)
      - `message_type` (enum: 'user_question', 'ai_response', 'ai_analysis', 'ai_suggestion')
      - `content` (text, message content)
      - `metadata` (jsonb, additional data like analysis results)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only access AI threads for conversations they participate in
    - AI messages are readable by conversation participants only

  3. Indexes
    - Index on conversation_id for fast lookups
    - Index on thread_id for message queries
    - Index on created_at for chronological ordering
*/

-- Create AI chat threads table
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text UNIQUE NOT NULL,
  user1_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('user_question', 'ai_response', 'ai_analysis', 'ai_suggestion')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_chat_threads
CREATE POLICY "Users can access own conversation threads"
  ON ai_chat_threads
  FOR ALL
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid())
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can access messages from own threads"
  ON ai_chat_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_threads 
      WHERE ai_chat_threads.id = ai_chat_messages.thread_id 
      AND (ai_chat_threads.user1_id = auth.uid() OR ai_chat_threads.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_threads 
      WHERE ai_chat_threads.id = ai_chat_messages.thread_id 
      AND (ai_chat_threads.user1_id = auth.uid() OR ai_chat_threads.user2_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_conversation_id ON ai_chat_threads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_users ON ai_chat_threads(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_thread_id ON ai_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_type ON ai_chat_messages(message_type);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_ai_chat_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_chat_threads_updated_at_trigger
  BEFORE UPDATE ON ai_chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_threads_updated_at();
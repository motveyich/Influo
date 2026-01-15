/*
  # Add conversation_init message type

  1. Changes
    - Update chat_messages table message_type constraint to include 'conversation_init'
    - This type is used to initialize empty conversations in the database
    - Allows conversations to exist even without user messages

  2. Purpose
    - When users click "Go to chat", a conversation_init message is created
    - This ensures the conversation appears for both users
    - The conversation persists across page reloads
    - System messages of this type are hidden in the UI

  3. Security
    - Existing RLS policies remain unchanged
    - Only adds new message type option
*/

-- Update the check constraint to include conversation_init message type
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_message_type_check
CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'offer'::text, 'payment_window'::text, 'payment_confirmation'::text, 'conversation_init'::text]));
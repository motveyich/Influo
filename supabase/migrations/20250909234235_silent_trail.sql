/*
  # Update chat message types to support payment messages
  
  1. Changes
    - Update chat_messages table message_type constraint to include payment types
    - Add support for 'payment_window' and 'payment_confirmation' message types
  
  2. Security
    - Existing RLS policies remain unchanged
    - Only adds new message type options
*/

-- Update the check constraint to include payment message types
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'offer'::text, 'payment_window'::text, 'payment_confirmation'::text]));
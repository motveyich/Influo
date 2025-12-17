/*
  # Create get_user_chats RPC Function

  1. New Functions
    - `get_user_chats(p_user_id)` - Returns a list of chat conversations for a user
      - Aggregates messages by conversation partner
      - Returns last message content, timestamp, and unread count
      - Includes partner's profile information (name, avatar)

  2. Purpose
    - Provides efficient chat list retrieval without multiple queries
    - Groups messages by conversation and returns summary data
    - Used by the chat service for the main chat list view
*/

CREATE OR REPLACE FUNCTION get_user_chats(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_avatar text,
  last_message text,
  last_message_time timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT DISTINCT
      CASE
        WHEN cm.sender_id = p_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END AS other_user_id
    FROM chat_messages cm
    WHERE cm.sender_id = p_user_id OR cm.receiver_id = p_user_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (
      CASE
        WHEN cm.sender_id = p_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END
    )
      CASE
        WHEN cm.sender_id = p_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END AS other_user_id,
      cm.message_content,
      cm.timestamp
    FROM chat_messages cm
    WHERE cm.sender_id = p_user_id OR cm.receiver_id = p_user_id
    ORDER BY
      CASE
        WHEN cm.sender_id = p_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END,
      cm.timestamp DESC
  ),
  unread_counts AS (
    SELECT
      cm.sender_id AS other_user_id,
      COUNT(*) AS unread
    FROM chat_messages cm
    WHERE cm.receiver_id = p_user_id
      AND cm.is_read = false
    GROUP BY cm.sender_id
  )
  SELECT
    c.other_user_id AS user_id,
    COALESCE(up.full_name, 'Unknown User') AS user_name,
    up.avatar AS user_avatar,
    lm.message_content AS last_message,
    lm.timestamp AS last_message_time,
    COALESCE(uc.unread, 0) AS unread_count
  FROM conversations c
  LEFT JOIN user_profiles up ON up.user_id = c.other_user_id
  LEFT JOIN last_messages lm ON lm.other_user_id = c.other_user_id
  LEFT JOIN unread_counts uc ON uc.other_user_id = c.other_user_id
  ORDER BY lm.timestamp DESC NULLS LAST;
END;
$$;

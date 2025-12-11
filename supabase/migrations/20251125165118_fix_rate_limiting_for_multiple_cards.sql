/*
  # Fix rate limiting for multiple cards from same user
  
  ## Problem
  Current rate limiting blocks ALL interactions with a user for 1 hour after any interaction.
  This prevents adding multiple cards from the same user to favorites.
  
  ## Changes
  1. Update is_rate_limited function to check card_id when interaction_type is 'favorite'
  2. For favorites, only block if the SAME card was recently favorited
  3. For other interaction types (applications, offers), keep user-level blocking
  
  ## Behavior After Fix
  - Adding different cards from the same user to favorites: ALLOWED
  - Adding the same card twice: BLOCKED (1 hour cooldown)
  - Multiple applications to same user: BLOCKED (1 hour cooldown)
  - Multiple offers to same user: BLOCKED (1 hour cooldown)
*/

-- Drop the old function
DROP FUNCTION IF EXISTS is_rate_limited(uuid, uuid);

-- Create improved rate limit function with card-specific logic
CREATE OR REPLACE FUNCTION is_rate_limited(
  p_user_id uuid,
  p_target_user_id uuid,
  p_interaction_type text DEFAULT NULL,
  p_card_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For favorite interactions with a specific card, check if THAT card was recently favorited
  IF p_interaction_type = 'favorite' AND p_card_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM rate_limit_interactions
      WHERE user_id = p_user_id
        AND target_user_id = p_target_user_id
        AND interaction_type = 'favorite'
        AND card_id = p_card_id
        AND created_at > now() - interval '1 hour'
    );
  END IF;
  
  -- For all other interaction types, check user-level rate limiting
  RETURN EXISTS (
    SELECT 1 FROM rate_limit_interactions
    WHERE user_id = p_user_id
      AND target_user_id = p_target_user_id
      AND created_at > now() - interval '1 hour'
  );
END;
$$;

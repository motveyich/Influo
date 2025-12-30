/*
  # Update rate limiting to support card-specific checks for applications
  
  ## Problem
  Current rate limiting only checks card_id for favorites, but applications also need
  card-specific rate limiting. Users should be able to apply to multiple cards from 
  the same user, but not to the same card within 1 hour.
  
  ## Changes
  Update is_rate_limited function to check card_id for both 'favorite' and 'application' types
  
  ## Behavior After Fix
  - Multiple applications to different cards from same user: ALLOWED
  - Application to same card twice within 1 hour: BLOCKED
  - Multiple favorites to different cards from same user: ALLOWED
  - Adding same card to favorites twice within 1 hour: BLOCKED
  - Multiple automatic/manual offers to same user: BLOCKED (user-level)
*/

-- Drop the old function
DROP FUNCTION IF EXISTS is_rate_limited(uuid, uuid, text, uuid);

-- Create improved rate limit function with card-specific logic for applications and favorites
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
  -- For favorite and application interactions with a specific card, 
  -- check if THAT card was recently interacted with
  IF p_interaction_type IN ('favorite', 'application') AND p_card_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM rate_limit_interactions
      WHERE user_id = p_user_id
        AND target_user_id = p_target_user_id
        AND interaction_type = p_interaction_type
        AND card_id = p_card_id
        AND created_at > now() - interval '1 hour'
    );
  END IF;
  
  -- For all other interaction types (offers), check user-level rate limiting
  RETURN EXISTS (
    SELECT 1 FROM rate_limit_interactions
    WHERE user_id = p_user_id
      AND target_user_id = p_target_user_id
      AND created_at > now() - interval '1 hour'
  );
END;
$$;

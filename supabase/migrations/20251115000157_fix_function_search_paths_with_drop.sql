/*
  # Fix Function Search Paths - Drop and Recreate
  
  1. Security Improvements
    - Set search_path to 'public' for all functions
    - Prevents potential SQL injection via search_path manipulation
    
  2. Functions Updated
    - All trigger and utility functions
*/

-- Drop all functions first
DROP FUNCTION IF EXISTS update_support_ticket_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_ai_chat_threads_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_payment_windows_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_user_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_user_permission(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS update_payment_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS update_user_rating() CASCADE;
DROP FUNCTION IF EXISTS soft_delete_content(text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_influencer_cards_last_updated() CASCADE;

-- Recreate with proper search_path

CREATE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_ai_chat_threads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_payment_windows_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_influencer_cards_last_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION get_user_role(user_id uuid)
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_val public.user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM user_profiles
  WHERE user_profiles.user_id = get_user_role.user_id
  AND is_deleted = false
  LIMIT 1;
  
  RETURN COALESCE(user_role_val, 'influencer'::public.user_role);
END;
$$;

CREATE FUNCTION check_user_permission(user_id uuid, permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_val public.user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM user_profiles
  WHERE user_profiles.user_id = check_user_permission.user_id
  AND is_deleted = false;
  
  RETURN user_role_val IN ('admin', 'moderator');
END;
$$;

CREATE FUNCTION log_admin_action(
  admin_id uuid,
  action_type text,
  action_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action, details, created_at)
  VALUES (admin_id, action_type, action_details, NOW());
END;
$$;

CREATE FUNCTION update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE user_profiles
  SET 
    rating = (
      SELECT AVG(rating)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE user_id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION soft_delete_content(
  content_type text,
  content_id uuid,
  deleted_by_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF content_type = 'campaign' THEN
    UPDATE campaigns
    SET is_deleted = true, deleted_at = NOW(), deleted_by = deleted_by_id
    WHERE id = content_id;
  ELSIF content_type = 'influencer_card' THEN
    UPDATE influencer_cards
    SET is_deleted = true, deleted_at = NOW(), deleted_by = deleted_by_id
    WHERE id = content_id;
  ELSIF content_type = 'user_profile' THEN
    UPDATE user_profiles
    SET is_deleted = true, deleted_at = NOW(), deleted_by = deleted_by_id
    WHERE user_id = content_id;
  END IF;
END;
$$;

-- Recreate triggers that were dropped

CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

CREATE TRIGGER update_ai_chat_threads_timestamp
  BEFORE UPDATE ON ai_chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_threads_updated_at();

CREATE TRIGGER update_payment_windows_timestamp
  BEFORE UPDATE ON payment_windows
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_windows_updated_at();

CREATE TRIGGER update_user_settings_timestamp
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

CREATE TRIGGER update_payment_requests_timestamp
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();

CREATE TRIGGER update_influencer_cards_timestamp
  BEFORE UPDATE ON influencer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_influencer_cards_last_updated();

CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

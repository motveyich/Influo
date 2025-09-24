/*
  # Fix Admin Permissions and RLS Policies

  1. Admin Permissions
    - Fix campaigns table RLS policies for admin operations
    - Fix user_profiles table RLS policies for user blocking/unblocking
    - Add proper admin policies for all content management

  2. Security
    - Ensure admins and moderators can manage content
    - Prevent users from blocking themselves
    - Allow proper user restoration
*/

-- Drop conflicting policies first
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_block_users" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON public.user_profiles;

-- Create comprehensive admin policy for user management
CREATE POLICY "admin_moderator_comprehensive_user_management"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (
    -- Admins and moderators can manage all users except themselves for blocking
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
    AND (
      -- Allow all operations on other users
      user_id != auth.uid()
      OR 
      -- Allow self-updates but not self-blocking
      (user_id = auth.uid() AND (TG_OP != 'UPDATE' OR is_deleted = false))
    )
  )
  WITH CHECK (
    -- Same conditions for inserts/updates
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
    AND (
      user_id != auth.uid()
      OR 
      (user_id = auth.uid() AND is_deleted = false)
    )
  );

-- Fix campaigns table policies
DROP POLICY IF EXISTS "Advertisers can manage own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Anyone can read active campaigns" ON public.campaigns;

-- Recreate campaigns policies with admin support
CREATE POLICY "Users can read campaigns"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    -- Everyone can read non-deleted campaigns
    is_deleted = false
    OR
    -- Admins/moderators can read deleted campaigns
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
    OR
    -- Owners can read their own campaigns
    advertiser_id = auth.uid()
  );

CREATE POLICY "Advertisers can manage own campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Admins can manage all campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  );

-- Fix influencer_cards policies for admin management
DROP POLICY IF EXISTS "Users can manage own cards" ON public.influencer_cards;
DROP POLICY IF EXISTS "Anyone can read active influencer cards" ON public.influencer_cards;

CREATE POLICY "Users can read influencer cards"
  ON public.influencer_cards
  FOR SELECT
  TO authenticated
  USING (
    -- Everyone can read active, non-deleted cards
    (is_active = true AND is_deleted = false)
    OR
    -- Users can read their own cards
    user_id = auth.uid()
    OR
    -- Admins/moderators can read all cards
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  );

CREATE POLICY "Users can manage own influencer cards"
  ON public.influencer_cards
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all influencer cards"
  ON public.influencer_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  );

-- Add admin policies for offers table
CREATE POLICY "Admins can manage all offers"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (
    -- Original user policies
    (influencer_id = auth.uid() OR advertiser_id = auth.uid())
    OR
    -- Admin override
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  )
  WITH CHECK (
    (influencer_id = auth.uid() OR advertiser_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  );

-- Add admin policies for payment_requests table
CREATE POLICY "Admins can manage all payment requests"
  ON public.payment_requests
  FOR ALL
  TO authenticated
  USING (
    -- Original user policies
    (created_by = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM offers o
      WHERE o.offer_id = payment_requests.offer_id
      AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
    ))
    OR
    -- Admin override
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  )
  WITH CHECK (
    (created_by = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM offers o
      WHERE o.offer_id = payment_requests.offer_id
      AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_deleted = false
    )
  );
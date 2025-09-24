/*
  # Fix admin permissions and campaign management

  1. Admin Permissions
    - Add policies for moderators and admins to manage campaigns
    - Add policies for moderators and admins to manage influencer cards
    - Fix user blocking permissions

  2. Campaign Management
    - Allow moderators and admins to delete campaigns (soft delete)
    - Allow moderators and admins to update campaigns
    - Allow moderators and admins to manage campaign moderation status

  3. User Management
    - Ensure proper RLS policies for user blocking/unblocking
    - Add policies for role management
*/

-- Campaign management policies for moderators and admins
CREATE POLICY IF NOT EXISTS "Moderators and admins can delete campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
);

CREATE POLICY IF NOT EXISTS "Moderators and admins can update campaigns for management"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
);

-- Influencer cards management policies for moderators and admins
CREATE POLICY IF NOT EXISTS "Moderators and admins can delete influencer cards"
ON public.influencer_cards
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
);

CREATE POLICY IF NOT EXISTS "Moderators and admins can update influencer cards for management"
ON public.influencer_cards
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
    AND user_profiles.is_deleted = false
  )
);

-- Enhanced user management policies for admins and moderators
DO $$
BEGIN
  -- Drop existing conflicting policies if they exist
  DROP POLICY IF EXISTS "admin_moderator_can_block_users" ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON public.user_profiles;
  
  -- Create new comprehensive policies
  CREATE POLICY "admin_moderator_can_manage_users_comprehensive"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow admins and moderators to manage other users (not themselves)
    user_id != auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  )
  WITH CHECK (
    -- Same condition for WITH CHECK
    user_id != auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  );
END $$;

-- Ensure offers table has proper policies for participants
DO $$
BEGIN
  -- Check if offers table exists and add policies if needed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers' AND table_schema = 'public') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can manage offers they participate in" ON public.offers;
    
    -- Create comprehensive offers policy
    CREATE POLICY "Users can manage offers they participate in"
    ON public.offers
    FOR ALL
    TO authenticated
    USING (
      influencer_id = auth.uid() OR advertiser_id = auth.uid()
    )
    WITH CHECK (
      influencer_id = auth.uid() OR advertiser_id = auth.uid()
    );
  END IF;
END $$;

-- Ensure payment_requests table has proper policies
DO $$
BEGIN
  -- Check if payment_requests table exists and add policies if needed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests' AND table_schema = 'public') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can read own payment requests" ON public.payment_requests;
    
    -- Create comprehensive payment requests policy
    CREATE POLICY "Users can read payment requests for their offers"
    ON public.payment_requests
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.offers o
        WHERE o.offer_id = payment_requests.offer_id
        AND (o.influencer_id = auth.uid() OR o.advertiser_id = auth.uid())
      )
    );
  END IF;
END $$;
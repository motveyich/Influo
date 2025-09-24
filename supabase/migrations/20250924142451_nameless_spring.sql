```sql
-- RLS policies for campaigns table
-- Allow authenticated users to read all campaigns
CREATE POLICY "Enable read access for all users" ON "public"."campaigns" AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Allow advertisers to manage their own campaigns
CREATE POLICY "Advertisers can manage own campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (advertiser_id = auth.uid())
WITH CHECK (advertiser_id = auth.uid());

-- Allow moderators and admins to delete campaigns
CREATE POLICY "Moderators and admins can delete campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- Allow moderators and admins to update campaigns (for soft delete and moderation status)
CREATE POLICY "Moderators and admins can update campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- RLS policies for influencer_cards table
-- Allow authenticated users to read active influencer cards
CREATE POLICY "Anyone can read active influencer cards"
ON public.influencer_cards
FOR SELECT
TO authenticated
USING (is_active = true OR user_id = auth.uid());

-- Allow users to manage their own cards
CREATE POLICY "Users can manage own cards"
ON public.influencer_cards
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow moderators and admins to delete influencer cards
CREATE POLICY "Moderators and admins can delete influencer cards"
ON public.influencer_cards
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- Allow moderators and admins to update influencer cards (for soft delete and moderation status)
CREATE POLICY "Moderators and admins can update influencer cards"
ON public.influencer_cards
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- RLS policies for offers table
-- Allow users to manage offers they are involved in
CREATE POLICY "Users can manage offers they're involved in"
ON public.offers
FOR ALL
TO authenticated
USING (influencer_id = auth.uid() OR advertiser_id = auth.uid())
WITH CHECK (influencer_id = auth.uid() OR advertiser_id = auth.uid());

-- Allow moderators and admins to delete offers
CREATE POLICY "Moderators and admins can delete offers"
ON public.offers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- Allow moderators and admins to update offers
CREATE POLICY "Moderators and admins can update offers"
ON public.offers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- RLS policies for payment_requests table
-- Allow users to manage their own payment requests (created by them)
CREATE POLICY "Creators can manage own payment requests"
ON public.payment_requests
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to read payment requests for offers they are involved in
CREATE POLICY "Users can read payment requests for offers they are involved in"
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

-- Allow moderators and admins to delete payment requests
CREATE POLICY "Moderators and admins can delete payment requests"
ON public.payment_requests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- Allow moderators and admins to update payment requests
CREATE POLICY "Moderators and admins can update payment requests"
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('moderator', 'admin')
  )
);

-- RLS policies for user_profiles table
-- Allow admins and moderators to update user_profiles (for blocking/unblocking)
-- This policy is more permissive than the existing ones, so it should be carefully considered
-- For now, it allows admins/moderators to update any profile except their own.
-- Existing policies for users to update their own profile remain.
CREATE POLICY "Admins and moderators can update any user profile except their own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  (user_id <> auth.uid()) AND
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  (user_id <> auth.uid()) AND
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role IN ('admin', 'moderator')
  )
);

-- Remove existing conflicting policies for user_profiles if they exist
-- This is a cleanup step to ensure the new policy takes precedence
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_block_users" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON public.user_profiles;

-- Re-add a policy for admins to update their own profile if needed, but the general one above covers it.
-- If specific fields are restricted for self-update, separate policies might be needed.
-- For now, relying on the general "users_can_update_own_profile" for self-updates.
```
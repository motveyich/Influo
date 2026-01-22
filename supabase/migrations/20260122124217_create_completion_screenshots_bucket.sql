/*
  # Create Storage Bucket for Completion Screenshots
  
  ## Overview
  Creates a private storage bucket for collaboration completion screenshots with strict security policies.
  
  ## Changes
  1. Create 'completion-screenshots' bucket for storing proof of completion
  2. Set bucket to private (only authorized users can access)
  3. Add RLS policies:
     - Authenticated users can upload screenshots to their own offer folders
     - Only offer participants (influencer and advertiser) can view screenshots
     - Users can update/delete their own uploaded screenshots
  
  ## Security
  - Upload restricted to authenticated users only
  - Users can only upload to folders matching offer IDs they participate in
  - Only offer participants can view the screenshots
  - Private bucket ensures no public access
  
  ## File Structure
  Files are stored as: {offer_id}/completion-screenshot.{ext}
*/

-- Create completion-screenshots bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'completion-screenshots',
  'completion-screenshots',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload completion screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Offer participants can view completion screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update completion screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete completion screenshots" ON storage.objects;

-- Allow authenticated users to upload completion screenshots
-- They can only upload to folders of offers they participate in
CREATE POLICY "Users can upload completion screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'completion-screenshots' AND
  EXISTS (
    SELECT 1 FROM offers
    WHERE offer_id::text = (storage.foldername(name))[1]
    AND (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  )
);

-- Allow offer participants to view completion screenshots
CREATE POLICY "Offer participants can view completion screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'completion-screenshots' AND
  EXISTS (
    SELECT 1 FROM offers
    WHERE offer_id::text = (storage.foldername(name))[1]
    AND (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  )
);

-- Allow users to update completion screenshots for their offers
CREATE POLICY "Users can update completion screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'completion-screenshots' AND
  EXISTS (
    SELECT 1 FROM offers
    WHERE offer_id::text = (storage.foldername(name))[1]
    AND (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'completion-screenshots' AND
  EXISTS (
    SELECT 1 FROM offers
    WHERE offer_id::text = (storage.foldername(name))[1]
    AND (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  )
);

-- Allow users to delete completion screenshots for their offers
CREATE POLICY "Users can delete completion screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'completion-screenshots' AND
  EXISTS (
    SELECT 1 FROM offers
    WHERE offer_id::text = (storage.foldername(name))[1]
    AND (influencer_id = auth.uid() OR advertiser_id = auth.uid())
  )
);

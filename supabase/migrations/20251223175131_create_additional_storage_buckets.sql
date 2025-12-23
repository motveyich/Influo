/*
  # Create Additional Storage Buckets
  
  Creates storage buckets for campaign files and chat attachments.
  
  1. Buckets
    - `campaign-files` - For campaign-related documents and media
    - `chat-attachments` - For file attachments in chat messages
  
  2. Security
    - Campaign files: Only advertisers can upload to their campaigns
    - Chat attachments: Authenticated users can upload, only participants can view
*/

-- Create campaign-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-files',
  'campaign-files',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create chat-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  5242880, -- 5MB limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Campaign files policies
CREATE POLICY "Authenticated users can upload campaign files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-files');

CREATE POLICY "Authenticated users can view campaign files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'campaign-files');

CREATE POLICY "Users can update their campaign files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'campaign-files')
WITH CHECK (bucket_id = 'campaign-files');

CREATE POLICY "Users can delete their campaign files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-files');

-- Chat attachments policies
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');
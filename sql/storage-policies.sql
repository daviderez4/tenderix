-- Storage Policies for tender-documents bucket
-- Run this in Supabase SQL Editor

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tender-documents');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'tender-documents');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'tender-documents');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'tender-documents');

-- Also allow anon for public access (since bucket is public)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'tender-documents');

-- Allow anon to upload (for demo purposes - can be restricted later)
CREATE POLICY "Anon can upload" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'tender-documents');

SELECT 'Storage policies created!' as status;

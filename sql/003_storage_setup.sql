-- ============================================
-- TENDERIX STORAGE SETUP
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- IMPORTANT: First create the bucket manually:
-- 1. Go to Supabase Dashboard
-- 2. Storage -> New Bucket
-- 3. Name: tender-documents
-- 4. Public: YES
-- 5. File size limit: 50MB

-- ============================================
-- STORAGE POLICIES (Run after bucket exists)
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations for tender-documents" ON storage.objects;

-- Create comprehensive policy for tender-documents bucket
CREATE POLICY "Allow all operations for tender-documents"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'tender-documents')
WITH CHECK (bucket_id = 'tender-documents');

-- If you want more granular control, use these instead:

-- SELECT (read) - anyone can read
CREATE POLICY "Anyone can view tender-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tender-documents');

-- INSERT (upload) - anyone can upload (for demo/development)
CREATE POLICY "Anyone can upload to tender-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'tender-documents');

-- UPDATE - anyone can update (for demo/development)
CREATE POLICY "Anyone can update tender-documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'tender-documents');

-- DELETE - anyone can delete (for demo/development)
CREATE POLICY "Anyone can delete from tender-documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'tender-documents');

SELECT 'Storage policies created for tender-documents bucket!' as status;

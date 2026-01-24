-- Create feedback table for dev team communication
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dev_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  author_name text NOT NULL,
  page_url text,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes text
);

-- Add RLS policy (allow all for now since it's internal dev tool)
ALTER TABLE dev_feedback ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write
CREATE POLICY "Allow all for dev_feedback" ON dev_feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dev_feedback_status ON dev_feedback(status);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_created_at ON dev_feedback(created_at DESC);

-- Sample data to test
INSERT INTO dev_feedback (author_name, page_url, message, priority, status) VALUES
('עידו', '/gates', 'בדיקת המערכת - הכל נראה תקין כרגע. ממשיך לבדוק את הניתוח של תנאי הסף.', 'medium', 'pending');

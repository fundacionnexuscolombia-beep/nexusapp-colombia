-- Add status column to profiles table to support inactive students
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add a comment explaining the column
COMMENT ON COLUMN public.profiles.status IS 'Status of the student: active or inactive. Inactive students are preserved but cannot log in or appear in active lists.';

-- Add access_enabled column to profiles table
-- This column will control whether a student can view academic subjects
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN DEFAULT FALSE;

-- Update RLS Policy to ensure students can't bypass this via API if needed 
-- (Optional, but good for security)
-- Note: The UI logic will handle most of the "hiding" for UX.

COMMENT ON COLUMN public.profiles.access_enabled IS 'Indicates if the student has access to academic subjects (usually after first live class).';

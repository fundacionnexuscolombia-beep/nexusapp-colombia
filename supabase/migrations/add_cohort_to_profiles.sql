-- Add cohort column to profiles for academic scheduling
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT 'Enero 2026';

-- Update existing profiles that might need it
UPDATE public.profiles SET cohort = 'Enero 2026' WHERE cohort IS NULL;

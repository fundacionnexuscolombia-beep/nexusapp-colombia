-- Add the ai_gems column to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_gems INT DEFAULT 10;

-- Ensure existing users get 10 gems initially
UPDATE public.profiles SET ai_gems = 10 WHERE ai_gems IS NULL;

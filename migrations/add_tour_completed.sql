-- Migration to add tour_completed column to profiles table
-- This flag tracks whether a user has completed the initial guided tour

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

-- Optional: If you want to force all current users to NOT see the tour (since they are already using the app),
-- you can run this update instead:
-- UPDATE public.profiles SET tour_completed = TRUE;

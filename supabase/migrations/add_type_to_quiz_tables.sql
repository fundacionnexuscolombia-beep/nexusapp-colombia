-- Add type column to quiz_attempts to distinguish between quiz and workshop
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS type text DEFAULT 'quiz';

-- Add type column to quiz_questions for the same reason
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS type text DEFAULT 'quiz';

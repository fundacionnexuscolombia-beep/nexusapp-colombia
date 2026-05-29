-- Add columns to track daily AI usage limits
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_messages_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_date TIMESTAMP WITH TIME ZONE;

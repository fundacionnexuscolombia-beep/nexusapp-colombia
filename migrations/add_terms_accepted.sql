-- Add terms_accepted column to profiles table
alter table public.profiles 
add column if not exists terms_accepted boolean default false;

-- Add terms_accepted_at column to track when they accepted
alter table public.profiles
add column if not exists terms_accepted_at timestamp with time zone;

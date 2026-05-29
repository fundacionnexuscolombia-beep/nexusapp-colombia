-- Add cohort column to profiles
alter table public.profiles 
add column if not exists cohort text; -- e.g. 'Enero', 'Marzo', 'Junio'

-- Add index for performance check
create index if not exists idx_profiles_cohort on public.profiles(cohort);

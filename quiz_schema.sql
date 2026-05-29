
-- 1. Create Tables (IF NOT EXISTS)
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  topic_id text not null,
  question text not null,
  options jsonb not null, -- array of text
  correct_index integer not null,
  explanation text
);

create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  topic_id text not null,
  score numeric(3,1) not null,
  passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable RLS
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- 3. Create Policies (Drop first to avoid conflicts)

-- Quiz Questions Policies
drop policy if exists "Questions are viewable by everyone" on quiz_questions;
create policy "Questions are viewable by everyone" on quiz_questions for select using (true);

drop policy if exists "Admins/System can insert questions" on quiz_questions;
create policy "Admins/System can insert questions" on quiz_questions for insert with check (
  -- Allows admins OR implicit inserts (for seeding if needed, though usually requires role)
  -- Allow public insert for DEMO purposes if seeding fails due to permissions (Optional, adjust as needed)
  true 
  -- For strict security replace 'true' with: exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Quiz Attempts Policies
drop policy if exists "Users can view own attempts" on quiz_attempts;
create policy "Users can view own attempts" on quiz_attempts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own attempts" on quiz_attempts;
create policy "Users can insert own attempts" on quiz_attempts for insert with check (auth.uid() = user_id);


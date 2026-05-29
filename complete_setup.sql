
-- ==========================================
-- 1. TABLA DE PERFILES (PROFILES)
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  role text check (role in ('student', 'admin')) default 'student',
  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

-- Policies for Profiles
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- ==========================================
-- 2. TABLA DE PROGRESO (STUDENT_PROGRESS)
-- ==========================================
create table if not exists public.student_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  course_id text not null,
  lesson_id text not null,
  status text check (status in ('started', 'in_progress', 'completed')) default 'started',
  score integer default 0,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, course_id, lesson_id)
);

alter table public.student_progress enable row level security;

-- Policies for Progress
drop policy if exists "Users can view their own progress." on student_progress;
create policy "Users can view their own progress." on student_progress for select using ( auth.uid() = user_id );

drop policy if exists "Users can insert/update their own progress." on student_progress;
create policy "Users can insert/update their own progress." on student_progress for all using ( auth.uid() = user_id );

-- ==========================================
-- 3. TABLA DE PREGUNTAS DEL QUIZ
-- ==========================================
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  topic_id text not null,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text
);

alter table public.quiz_questions enable row level security;

-- Policies for Questions
drop policy if exists "Questions are viewable by everyone" on quiz_questions;
create policy "Questions are viewable by everyone" on quiz_questions for select using (true);

drop policy if exists "Admins/System can insert questions" on quiz_questions;
create policy "Admins/System can insert questions" on quiz_questions for insert with check (true);

-- ==========================================
-- 4. TABLA DE INTENTOS DE QUIZ
-- ==========================================
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  topic_id text not null,
  score numeric(3,1) not null,
  passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.quiz_attempts enable row level security;

-- Policies for Attempts
drop policy if exists "Users can view own attempts" on quiz_attempts;
create policy "Users can view own attempts" on quiz_attempts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own attempts" on quiz_attempts;
create policy "Users can insert own attempts" on quiz_attempts for insert with check (auth.uid() = user_id);

-- ==========================================
-- 5. FUNCIONES Y TRIGGERS (AUTOMATIZACIÓN)
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing; -- Prevent error if profile exists
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for public profiles using the ID from auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  role text check (role in ('student', 'admin')) default 'student',
  terms_accepted boolean default false,
  terms_accepted_at timestamp with time zone,
  email text unique,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for Quiz Questions
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  topic_id text not null,
  question text not null,
  options text[] not null, -- Array of strings
  correct_index integer not null,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for quiz_questions
alter table public.quiz_questions enable row level security;

-- Allow anyone to read questions
create policy "Public load questions"
  on quiz_questions for select
  using ( true );

-- Allow authenticated users (students) to seed questions (needed for auto-seed logic)
create policy "Authenticated seed questions"
  on quiz_questions for insert
  with check ( auth.role() = 'authenticated' );
  
-- Allow authenticated users to delete questions (for force refresh logic)
create policy "Authenticated delete questions"
  on quiz_questions for delete
  using ( auth.role() = 'authenticated' );

-- Create a table for Quiz Attempts
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  topic_id text not null,
  score numeric(3,1) not null,
  passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for quiz_attempts
alter table public.quiz_attempts enable row level security;

-- Users can view and insert their own attempts
create policy "Users view own attempts"
  on quiz_attempts for select
  using ( auth.uid() = user_id );

create policy "Users insert own attempts"
  on quiz_attempts for insert
  with check ( auth.uid() = user_id );

-- Create a table for student progress
create table public.student_progress (
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

-- Set up RLS for student_progress
alter table public.student_progress enable row level security;

create policy "Users can view their own progress."
  on student_progress for select
  using ( auth.uid() = user_id );

create policy "Users can insert/update their own progress."
  on student_progress for all
  using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Table for Extracurricular Grades (Manual entries by Admin)
create table public.extracurricular_grades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  topic_id text not null, -- Can be a custom string like 'extra-math-1'
  topic_name text not null, -- Display name e.g. "Proyecto de Feria de Ciencias"
  score numeric(4,2) check (score >= 0 and score <= 5.0),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  created_by uuid references public.profiles(id) -- ID of the admin who graded it
);

-- RLS for extracurricular_grades
alter table public.extracurricular_grades enable row level security;

-- Admins can do everything, Students can only view their own
create policy "Admins can do all on grades"
  on extracurricular_grades
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Students view own grades"
  on extracurricular_grades for select
  using ( auth.uid() = user_id );

-- Table for Dynamic News
create table if not exists public.news (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null, -- 'Académico', 'Evento', 'Administrativo', etc.
  summary text,
  content text not null,
  date text, -- Display date (e.g., '24 Feb, 2026')
  image text, -- URL to cover image
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- RLS for news
alter table public.news enable row level security;

create policy "Anyone can read news"
  on news for select
  using ( is_active = true );

create policy "Admins can manage news"
  on news for all
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

-- Seed some initial news
insert into public.news (title, content, summary, category, date, image)
values 
('Bienvenidos al Ciclo 2026', 'Iniciamos un nuevo año lleno de aprendizaje y metas por cumplir. ¡Éxitos a todos los estudiantes de la Fundación Nexus!', 'Iniciamos un nuevo año lleno de aprendizaje y metas por cumplir.', 'Administrativo', '24 Feb, 2026', 'https://images.unsplash.com/photo-1523050853064-dbad321975b7?auto=format&fit=crop&q=80&w=800'),
('Mantenimiento Programado', 'La plataforma entrará en mantenimiento el próximo domingo de 2:00 AM a 4:00 AM para optimizar la velocidad de carga.', 'La plataforma entrará en mantenimiento el próximo domingo por la madrugada.', 'Aviso', '25 Feb, 2026', 'https://images.unsplash.com/photo-1599508704512-2f19fe912013?auto=format&fit=crop&q=80&w=800'),
('Nuevas Guías Disponibles', 'Ya puedes descargar las guías de Matemáticas y Ciencias en la sección de materias para los grupos de Enero y Marzo.', 'Ya puedes descargar las guías de Matemáticas y Ciencias.', 'Académico', '26 Feb, 2026', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800');

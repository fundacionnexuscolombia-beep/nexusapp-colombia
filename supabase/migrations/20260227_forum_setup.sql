-- Discussion topics table (Threads)
create table if not exists public.forum_topics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  category text not null, -- Subject/Materia
  title text not null,
  content text not null,
  is_public boolean default true,
  created_at timestamp with time zone default now()
);

-- Discussion posts (Replies)
create table if not exists public.forum_posts (
  id uuid default gen_random_uuid() primary key,
  topic_id uuid references public.forum_topics(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  is_highlighted boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;

-- Topic Policies
create policy "Public can view topics" on forum_topics for select using (true);
create policy "Authenticated can create topics" on forum_topics for insert with check (auth.role() = 'authenticated');
create policy "Users can update/delete own topics" on forum_topics for all using (auth.uid() = user_id);

-- Post Policies
create policy "Public can view posts" on forum_posts for select using (true);
create policy "Authenticated can create posts" on forum_posts for insert with check (auth.role() = 'authenticated');
create policy "Users can update/delete own posts" on forum_posts for all using (auth.uid() = user_id);
create policy "Admins can highlight posts" on forum_posts for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

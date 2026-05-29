-- Create a table for app notifications if it doesn't exist
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text not null,
  type text check (type in ('ai', 'payment', 'grade', 'info', 'reminder')) default 'info',
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Access control for notifications
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using ( auth.uid() = user_id );

create policy "Users can update their own notifications"
  on notifications for update
  using ( auth.uid() = user_id );

create policy "System/Admin can insert notifications"
  on notifications for insert
  with check ( true ); -- In a production app, restrict this to service_role or admin

-- Create a table to store device push tokens
create table if not exists public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  token text not null,
  platform text check (platform in ('android', 'ios', 'web')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, token)
);

-- Access control for push_tokens
alter table public.push_tokens enable row level security;

create policy "Users can manage their own tokens"
  on push_tokens for all
  using ( auth.uid() = user_id );

-- Function to mark all as read
create or replace function public.mark_all_notifications_as_read(target_user_id uuid)
returns void as $$
begin
  update public.notifications
  set is_read = true
  where user_id = target_user_id;
end;
$$ language plpgsql security definer;

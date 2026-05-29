-- Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text not null,
  type text check (type in ('ai', 'payment', 'grade', 'info')) default 'info',
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on notifications for select
  using ( auth.uid() = user_id );

create policy "Users can update their own notifications"
  on notifications for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Admins can insert notifications for any user"
  on notifications for insert
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

-- Function to mark all as read
create or replace function mark_all_notifications_as_read(target_user_id uuid)
returns void as $$
begin
  update public.notifications
  set is_read = true
  where user_id = target_user_id;
end;
$$ language plpgsql security definer;

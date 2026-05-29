-- Create payments table
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  concept text not null, -- e.g. "Cuota 1/8", "Derechos de Grado"
  amount numeric not null,
  due_date date not null,
  status text check (status in ('pending', 'paid', 'overdue')) default 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table public.payments enable row level security;

-- Policies
-- Admins can view and manage all payments
create policy "Admins manage all payments"
  on public.payments
  for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- Students can view their own payments
create policy "Students view own payments"
  on public.payments
  for select
  using ( auth.uid() = user_id );

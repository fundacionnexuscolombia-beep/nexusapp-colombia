-- ========================================================
-- CONFIGURACIÓN DE TIEMPO REAL Y NOTIFICACIONES PUSH
-- ========================================================

-- 1. Crear la tabla de tokens para dispositivos si no existe
create table if not exists public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  token text not null,
  platform text check (platform in ('android', 'ios', 'web')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, token)
);

-- 2. Habilitar RLS (Seguridad a Nivel de Fila)
alter table public.push_tokens enable row level security;

-- 3. Crear política para que cada usuario gestione sus propios tokens
drop policy if exists "Users can manage their own tokens" on public.push_tokens;
create policy "Users can manage their own tokens"
  on public.push_tokens for all
  using ( auth.uid() = user_id );

-- 4. Habilitar la transmisión en Tiempo Real (Realtime) para las notificaciones
-- Esto permite que los dispositivos reciban las actualizaciones al instante sin refrescar la página.
begin;
  -- Agrega la tabla a la publicación de tiempo real de Supabase
  alter publication supabase_realtime add table public.notifications;
commit;

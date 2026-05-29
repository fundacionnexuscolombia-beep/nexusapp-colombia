-- ==========================================
-- SETUP DE NOTIFICACIONES (Nexus App)
-- ==========================================

-- 1. Tabla de Notificaciones
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  body text not null,
  type text check (type in ('ai', 'payment', 'grade', 'info', 'reminder')) default 'info',
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on notifications;
create policy "Users can view own notifications" on notifications 
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications" on notifications 
  for update using (auth.uid() = user_id);

-- 2. Función para Marcar Todo como Leído
create or replace function public.mark_all_notifications_as_read(target_user_id uuid)
returns void as $$
begin
  update public.notifications
  set is_read = true
  where user_id = target_user_id;
end;
$$ language plpgsql security definer;

-- 3. Trigger para Notificar a Admins sobre Nuevos Registros
create or replace function public.notify_admin_new_student()
returns trigger as $$
declare
    admin_id uuid;
begin
    -- Buscar el primer administrador (o podrías notificar a todos en un bucle)
    select id into admin_id from public.profiles where role = 'admin' limit 1;
    
    if admin_id is not null then
        insert into public.notifications (user_id, title, body, type)
        values (
            admin_id, 
            'Nuevo Estudiante: ' || new.full_name, 
            'Se ha registrado un nuevo estudiante en la cohorte ' || coalesce(new.cohort, 'Sin definir') || '.',
            'info'
        );
    end if;
    
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_student_registered on public.profiles;
create trigger on_new_student_registered
  after insert on public.profiles
  for each row 
  when (new.role = 'student')
  execute procedure public.notify_admin_new_student();

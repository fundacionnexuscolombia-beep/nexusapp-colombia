-- Copia y pega esto en tu SQL Editor de Supabase
-- ===============================================

-- 1. Crear función que notifica a todos los estudiantes de una nueva noticia
create or replace function public.notify_students_on_news()
returns trigger as $$
begin
  -- Insertar un aviso para CADA perfil que sea 'student'
  insert into public.notifications (user_id, title, body, type)
  select 
    id, 
    '¡Hay novedades en el tablero de noticias!',
    new.title, -- Opcional: poner el título de la noticia en el cuerpo
    'info'
  from public.profiles
  where role = 'student';
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Asignar el Trigger a la tabla 'news'
drop trigger if exists on_new_news_created on public.news;
create trigger on_new_news_created
  after insert on public.news
  for each row execute procedure public.notify_students_on_news();

-- 3. (OPCIONAL) Generar avisos para las noticias que ya están publicadas
-- Ejecuta esto si quieres que a Laura le lleguen avisos de las noticias de hoy de inmediato:
-- insert into public.notifications (user_id, title, body, type)
-- select p.id, '¡Hay novedades en el tablero de noticias!', n.title, 'info'
-- from public.profiles p, public.news n
-- where p.role = 'student' and n.is_active = true
-- on conflict do nothing;

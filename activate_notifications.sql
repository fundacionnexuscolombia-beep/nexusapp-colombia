-- Copia y pega esto en tu SQL Editor de Supabase
-- ===============================================

-- 1. Actualizar la función de creación de perfil para incluir bienvenida
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Crear el perfil (ya existente)
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'Estudiante'), 
    new.raw_user_meta_data->>'avatar_url', 
    'student'
  );

  -- Enviar NOTIFICACIÓN DE BIENVENIDA automática al alumno
  insert into public.notifications (user_id, title, body, type)
  values (
    new.id,
    '¡Bienvenido a la Familia Nexus! 🚀',
    'Hola, estamos felices de acompañarte en tu proceso educativo. Explora tus materias y empieza hoy mismo.',
    'info'
  );

  return new;
end;
$$ language plpgsql security definer;

-- 2. (OPCIONAL) Enviar notificación de prueba a LAURA STUDENT
-- Necesitas el ID de Laura, si no lo tienes, puedes buscarla en la tabla profiles.
-- Supongamos que her user_id es 'EL_ID_DE_LAURA'
-- insert into public.notifications (user_id, title, body, type)
-- values ('EL_ID_DE_LAURA', '¡Confirmado!', 'Tu acceso ha sido activado. Ya puedes ver las noticias.', 'info');

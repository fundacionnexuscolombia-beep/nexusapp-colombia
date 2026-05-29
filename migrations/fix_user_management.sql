-- 1. Habilitar eliminación en cascada para la tabla de perfiles (CON auth.users)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Habilitar eliminación en cascada para Tablas Relacionadas (CON public.profiles)

-- Pagos
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey,
ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Progreso Académico
ALTER TABLE public.student_progress
DROP CONSTRAINT IF EXISTS student_progress_user_id_fkey,
ADD CONSTRAINT student_progress_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Intentos de Quiz
ALTER TABLE public.quiz_attempts
DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey,
ADD CONSTRAINT quiz_attempts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Calificaciones Extracurriculares
ALTER TABLE public.extracurricular_grades
DROP CONSTRAINT IF EXISTS extracurricular_grades_user_id_fkey,
ADD CONSTRAINT extracurricular_grades_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 3. Actualizar la función para que asigne el ROL desde la metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'student') -- Usa el rol de metadata o 'student' por defecto
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

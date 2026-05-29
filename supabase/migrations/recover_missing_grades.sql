-- Script para recuperar notas perdidas basadas en el progreso guardado
-- Se ajustó para evitar el desbordamiento numérico (numeric field overflow)
-- ya que quiz_attempts soporta máximo 99.9 y student_progress guardaba 100.

INSERT INTO public.quiz_attempts (user_id, topic_id, score, passed, type, created_at)
SELECT 
    user_id, 
    lesson_id, 
    CASE 
      WHEN score > 5 THEN 5.0 
      WHEN score = 0 THEN 5.0 
      ELSE GREATEST(score, 3.0)
    END,
    true, 
    'quiz', 
    updated_at
FROM public.student_progress sp
WHERE status = 'completed'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.quiz_attempts qa 
    WHERE qa.user_id = sp.user_id 
      AND qa.topic_id = sp.lesson_id
  );

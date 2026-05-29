
-- 1. Create cohorts table
CREATE TABLE IF NOT EXISTS public.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add cohort_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.cohorts(id);

-- 3. Enable RLS on cohorts
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- 4. Policies for cohorts
CREATE POLICY "Cohorts viewable by everyone" ON public.cohorts FOR SELECT USING (true);
CREATE POLICY "Admins can manage cohorts" ON public.cohorts FOR ALL 
USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 5. Create a default cohort for existing users (January 24th, 2026)
INSERT INTO public.cohorts (name, start_date)
VALUES ('Grupo Enero 2026', '2026-01-24T00:00:00Z')
ON CONFLICT DO NOTHING;

-- 6. Assign all current users to the default cohort
UPDATE public.profiles
SET cohort_id = (SELECT id FROM public.cohorts WHERE name = 'Grupo Enero 2026' LIMIT 1)
WHERE cohort_id IS NULL;

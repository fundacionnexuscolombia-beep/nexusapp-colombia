-- Add new columns to profiles table for student registration data

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS document_issue_date date,
ADD COLUMN IF NOT EXISTS document_issue_place text;

-- Add comment
COMMENT ON COLUMN public.profiles.document_number IS 'Documento de Identidad (C.C., T.I., etc.)';

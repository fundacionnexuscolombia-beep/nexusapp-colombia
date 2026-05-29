-- Add payment details for verification
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_method text, -- 'Bancolombia', 'Nequi', 'Efectivo', etc.
ADD COLUMN IF NOT EXISTS transaction_id text; -- 'Comprobante #1234'

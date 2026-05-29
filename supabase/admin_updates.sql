-- Add is_blocked column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Add RLS Policy for Admins to update any profile (to block/unblock)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING ( 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') 
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Ensure Admins can delete profiles (if not already handled by cascade or function)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

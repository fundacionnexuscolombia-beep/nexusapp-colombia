-- FIX FOR RLS POLICIES
-- Run this in the Supabase SQL Editor

-- 1. PROFILES TABLE: Allow admins to update any student profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. STORAGE: Fix 'avatars' bucket policies
-- Ensure the bucket exists and is public first

-- Select: Anyone can see profile pictures
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );

-- Insert: Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Update/Delete: Owners can manage their own files
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

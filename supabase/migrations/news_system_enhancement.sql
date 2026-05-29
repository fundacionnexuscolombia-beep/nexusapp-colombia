-- Create bucket for news images
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Enable RLS for news-images bucket
-- We assume administrators can do anything, and public can read.

-- 1. Allow public reading
drop policy if exists "Public Access to News Images" on storage.objects;
create policy "Public Access to News Images"
on storage.objects for select
using ( bucket_id = 'news-images' );

-- 2. Allow administrators to insert/update/delete
drop policy if exists "Admin Management of News Images" on storage.objects;
create policy "Admin Management of News Images"
on storage.objects for all
using (
  bucket_id = 'news-images' 
  and (select role from public.profiles where id = auth.uid()) = 'admin'
);

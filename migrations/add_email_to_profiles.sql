-- Add email column to profiles
alter table public.profiles 
add column if not exists email text;

-- Make email unique to effectively prevent duplicates at the profile level too
alter table public.profiles
add constraint profiles_email_key unique (email);

-- Update the handle_new_user function to include email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

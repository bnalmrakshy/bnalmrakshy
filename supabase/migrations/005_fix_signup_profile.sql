-- بيعيد إنشاء الـ trigger والدالة من الصفر + دالة أمان ensure_profile. آمن يتشغّل أكتر من مرة.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,display_name)
  values (new.id, lower(new.raw_user_meta_data->>'username'), trim(new.raw_user_meta_data->>'display_name'));
  return new; end $$;
drop trigger if exists on_signup on auth.users;
create trigger on_signup after insert on auth.users for each row execute function public.handle_new_user();

-- بتعمل بروفايل للمستخدم الحالي لو ناقص، من بيانات Auth بتاعته (دور member دايمًا)
create or replace function public.ensure_profile() returns boolean language plpgsql security definer set search_path=public as $$
declare u auth.users;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where id=auth.uid()) then return true; end if;
  select * into u from auth.users where id=auth.uid();
  insert into public.profiles(id,username,display_name)
  values (u.id, lower(u.raw_user_meta_data->>'username'), trim(u.raw_user_meta_data->>'display_name'));
  return true;
exception when others then return false; end $$;
revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- بيصلّح بس الحسابات "قابل للإصلاح" في diagnose_orphans.sql. نفس الـ UUID، دور member دايمًا، ومفيش حذف.
insert into public.profiles (id, username, display_name)
select u.id, lower(u.raw_user_meta_data->>'username'), trim(u.raw_user_meta_data->>'display_name')
from auth.users u
where not exists (select 1 from public.profiles p where p.id=u.id)
  and lower(u.raw_user_meta_data->>'username') ~ '^[a-z0-9_]{3,20}$'
  and char_length(trim(coalesce(u.raw_user_meta_data->>'display_name',''))) between 2 and 24
  and not exists (select 1 from public.profiles p where p.username=lower(u.raw_user_meta_data->>'username'))
  and not exists (select 1 from auth.users u2 where u2.id<>u.id and not exists (select 1 from public.profiles p2 where p2.id=u2.id)
    and lower(u2.raw_user_meta_data->>'username')=lower(u.raw_user_meta_data->>'username') and (u2.created_at,u2.id)<(u.created_at,u.id));

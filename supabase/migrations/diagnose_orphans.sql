-- للقراءة فقط: بيعرض حسابات Auth اللي ملهاش Profile، وهل تقدر تتصلّح. شغّله لوحده قبل 004.
select u.id, u.email, u.created_at,
  (select min(created_at) from public.profiles) as first_profile_at,
  u.raw_user_meta_data->>'username' as username, u.raw_user_meta_data->>'display_name' as display_name,
  case
    when coalesce(trim(u.raw_user_meta_data->>'username'),'')='' then 'username ناقص'
    when lower(u.raw_user_meta_data->>'username') !~ '^[a-z0-9_]{3,20}$' then 'username غير صالح'
    when char_length(trim(coalesce(u.raw_user_meta_data->>'display_name',''))) not between 2 and 24 then 'الاسم ناقص أو غير صالح'
    when exists (select 1 from public.profiles p where p.username=lower(u.raw_user_meta_data->>'username')) then 'username مستخدم في بروفايل تاني'
    when exists (select 1 from auth.users u2 where u2.id<>u.id and not exists (select 1 from public.profiles p2 where p2.id=u2.id)
      and lower(u2.raw_user_meta_data->>'username')=lower(u.raw_user_meta_data->>'username') and (u2.created_at,u2.id)<(u.created_at,u.id))
      then 'username مكرر بين حسابات يتيمة'
    else 'قابل للإصلاح' end as status
from auth.users u where not exists (select 1 from public.profiles p where p.id=u.id) order by u.created_at;

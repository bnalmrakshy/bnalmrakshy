-- شغّله بعد supabase/schema.sql (الأساس). مفيش حذف أو تعديل مدمر لبيانات.
create or replace function my_rank() returns int language sql stable security definer set search_path=public as $$
  select r::int from (select l.member_id, rank() over (order by sum(l.delta) desc) r
    from points_ledger l join profiles p on p.id=l.member_id where not p.suspended group by l.member_id) t
  where member_id=auth.uid() $$;

create or replace function admin_members(q text default '')
returns table(id uuid, username text, display_name text, role role_t, suspended boolean, streak int, points bigint, visits bigint)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select p.id,p.username,p.display_name,p.role,p.suspended,p.streak,
    coalesce((select sum(delta) from points_ledger where member_id=p.id),0)::bigint,
    (select count(*) from checkins where member_id=p.id)::bigint
  from profiles p where q='' or p.username ilike '%'||q||'%' or p.display_name ilike '%'||q||'%'
  order by p.created_at desc limit 200; end $$;

create or replace function admin_set_role(uid uuid, r role_t) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if uid = auth.uid() then raise exception 'cannot change own role'; end if;
  update profiles set role=r where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_role',jsonb_build_object('member',uid,'role',r)); end $$;

create or replace function admin_set_suspended(uid uuid, s boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if uid = auth.uid() then raise exception 'cannot suspend self'; end if;
  update profiles set suspended=s where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_suspended',jsonb_build_object('member',uid,'suspended',s)); end $$;

create or replace function admin_update_settings(pts int, target int) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if pts not between 1 and 100 or target not between 2 and 30 then raise exception 'bad values'; end if;
  update app_settings set points_per_visit=pts, streak_target=target where id=1;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'update_settings',jsonb_build_object('pts',pts,'target',target)); end $$;

create or replace function admin_recent_checkins(lim int default 50)
returns table(display_name text, day date, created_at timestamptz) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select p.display_name,c.day,c.created_at from checkins c join profiles p on p.id=c.member_id
    order by c.created_at desc limit least(lim,200); end $$;

revoke all on function my_rank(), admin_members(text), admin_set_role(uuid,role_t), admin_set_suspended(uuid,boolean),
  admin_update_settings(int,int), admin_recent_checkins(int) from public;
grant execute on function my_rank(), admin_members(text), admin_set_role(uuid,role_t), admin_set_suspended(uuid,boolean),
  admin_update_settings(int,int), admin_recent_checkins(int) to authenticated;

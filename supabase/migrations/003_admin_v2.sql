-- شغّله بعد 002. بيصلّح الحذف (cascade) ويشدّد حماية الأدمن ويضيف دوال إحصائيات وسجل. مفيش حذف بيانات.
alter table checkins drop constraint if exists checkins_member_id_fkey,
  add constraint checkins_member_id_fkey foreign key (member_id) references profiles(id) on delete cascade;
alter table points_ledger drop constraint if exists points_ledger_member_id_fkey,
  add constraint points_ledger_member_id_fkey foreign key (member_id) references profiles(id) on delete cascade;
alter table points_ledger drop constraint if exists points_ledger_checkin_id_fkey,
  add constraint points_ledger_checkin_id_fkey foreign key (checkin_id) references checkins(id) on delete cascade;
alter table free_drinks drop constraint if exists free_drinks_member_id_fkey,
  add constraint free_drinks_member_id_fkey foreign key (member_id) references profiles(id) on delete cascade;
alter table checkin_sessions drop constraint if exists checkin_sessions_opened_by_fkey,
  add constraint checkin_sessions_opened_by_fkey foreign key (opened_by) references profiles(id) on delete set null;

create or replace function admin_set_role(uid uuid, r role_t) returns void language plpgsql security definer set search_path=public as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  select role into cur from profiles where id=uid;
  if cur is null then raise exception 'not found'; end if;
  if uid = auth.uid() or cur = 'admin' then raise exception 'cannot change an admin'; end if;
  update profiles set role=r where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_role',jsonb_build_object('member',uid,'from',cur,'to',r)); end $$;

create or replace function admin_set_suspended(uid uuid, s boolean) returns void language plpgsql security definer set search_path=public as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  select role into cur from profiles where id=uid;
  if cur is null then raise exception 'not found'; end if;
  if uid = auth.uid() or cur = 'admin' then raise exception 'cannot suspend an admin'; end if;
  update profiles set suspended=s where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_suspended',jsonb_build_object('member',uid,'suspended',s)); end $$;

drop function if exists admin_members(text);
create function admin_members(q text default '')
returns table(id uuid, username text, display_name text, role role_t, suspended boolean, streak int, points bigint, visits bigint, created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select p.id,p.username,p.display_name,p.role,p.suspended,p.streak,
    coalesce((select sum(delta) from points_ledger where member_id=p.id),0)::bigint,
    (select count(*) from checkins where member_id=p.id)::bigint, p.created_at
  from profiles p where q='' or p.username ilike '%'||q||'%' or p.display_name ilike '%'||q||'%'
  order by p.created_at desc limit 500; end $$;

create function admin_stats() returns json language plpgsql stable security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return json_build_object('members',(select count(*) from profiles),'visits',(select count(*) from checkins),
    'points',(select coalesce(sum(delta),0) from points_ledger),'drinks',(select count(*) from free_drinks where used_at is null),
    'staff',(select count(*) from profiles where role='staff'),'suspended',(select count(*) from profiles where suspended),
    'target',(select streak_target from app_settings)); end $$;

create function admin_audit(lim int default 50)
returns table(id bigint, actor_name text, action text, target_name text, detail jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select a.id, pa.display_name, a.action, coalesce(pt.display_name, a.detail->>'username'), a.detail, a.created_at
    from audit_logs a left join profiles pa on pa.id=a.actor
    left join profiles pt on pt.id = case when coalesce(a.detail->>'member',a.detail->>'target') ~ '^[0-9a-f-]{36}$'
      then coalesce(a.detail->>'member',a.detail->>'target')::uuid end
    order by a.id desc limit least(lim,200); end $$;

revoke all on function admin_set_role(uuid,role_t), admin_set_suspended(uuid,boolean), admin_members(text), admin_stats(), admin_audit(int) from public;
grant execute on function admin_set_role(uuid,role_t), admin_set_suspended(uuid,boolean), admin_members(text), admin_stats(), admin_audit(int) to authenticated;

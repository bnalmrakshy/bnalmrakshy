-- المراكشي ستريك — شغّله في Supabase SQL Editor على مشروع جديد.
-- مهم: Authentication > Providers > Email > عطّل "Confirm email".
create type role_t as enum ('member','staff','admin');
create table app_settings (id int primary key default 1 check (id=1),
  points_per_visit int not null default 10, streak_target int not null default 7);
insert into app_settings default values;
create table profiles (id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 24),
  role role_t not null default 'member', suspended boolean not null default false,
  streak int not null default 0, last_visit date, created_at timestamptz not null default now());
create table checkin_sessions (id uuid primary key default gen_random_uuid(), opened_by uuid references profiles,
  token text not null, prev_token text, rotated_at timestamptz not null default now(),
  expires_at timestamptz not null, closed boolean not null default false);
create table checkins (id uuid primary key default gen_random_uuid(), member_id uuid not null references profiles,
  session_id uuid references checkin_sessions, day date not null, created_at timestamptz not null default now(),
  unique (member_id, day));
create table points_ledger (id bigserial primary key, member_id uuid not null references profiles,
  delta int not null, reason text not null, checkin_id uuid references checkins, created_at timestamptz not null default now());
create unique index no_double_award on points_ledger(checkin_id) where reason='visit';
create table free_drinks (id uuid primary key default gen_random_uuid(), member_id uuid not null references profiles,
  earned_at timestamptz not null default now(), code text unique, claimed_day date, used_at timestamptz);
create table audit_logs (id bigserial primary key, actor uuid, action text not null, detail jsonb, created_at timestamptz default now());

-- الحساب: الدور ما بييجي أبدًا من بيانات العميل (الأدمن بيتعيّن بـ SQL فقط)
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username,display_name)
  values (new.id, lower(new.raw_user_meta_data->>'username'), trim(new.raw_user_meta_data->>'display_name'));
  return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();
create function my_role() returns role_t language sql stable security definer set search_path=public
  as $$ select role from profiles where id=auth.uid() and not suspended $$;

alter table app_settings enable row level security; alter table profiles enable row level security;
alter table checkin_sessions enable row level security; alter table checkins enable row level security;
alter table points_ledger enable row level security; alter table free_drinks enable row level security;
alter table audit_logs enable row level security;
create policy s_read on app_settings for select using (true);
create policy p_read on profiles for select using (id=auth.uid() or my_role() in ('staff','admin'));
create policy c_read on checkins for select using (member_id=auth.uid() or my_role()='admin');
create policy l_read on points_ledger for select using (member_id=auth.uid() or my_role()='admin');
create policy f_read on free_drinks for select using (member_id=auth.uid() or my_role()='admin');
create policy a_read on audit_logs for select using (my_role()='admin');
-- مفيش insert/update/delete من العميل: كله عبر الدوال تحت.

create function open_session(mins int) returns checkin_sessions language plpgsql security definer set search_path=public as $$
declare r checkin_sessions;
begin
  if my_role() not in ('staff','admin') then raise exception 'forbidden'; end if;
  if mins not between 1 and 30 then raise exception 'bad duration'; end if;
  update checkin_sessions set closed=true where not closed;
  insert into checkin_sessions(opened_by,token,expires_at)
    values (auth.uid(), replace(gen_random_uuid()::text,'-',''), now()+make_interval(mins=>mins)) returning * into r;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'open_session',jsonb_build_object('mins',mins));
  return r; end $$;
create function rotate_session() returns checkin_sessions language plpgsql security definer set search_path=public as $$
declare r checkin_sessions;
begin
  if my_role() not in ('staff','admin') then raise exception 'forbidden'; end if;
  update checkin_sessions set prev_token=token, token=replace(gen_random_uuid()::text,'-',''), rotated_at=now()
    where not closed and expires_at>now() returning * into r;
  return r; end $$;
create function close_session() returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() not in ('staff','admin') then raise exception 'forbidden'; end if;
  update checkin_sessions set closed=true where not closed;
  insert into audit_logs(actor,action) values (auth.uid(),'close_session'); end $$;

create function scan_checkin(tok text) returns json language plpgsql security definer set search_path=public as $$
declare p profiles; s app_settings; sess checkin_sessions; cid uuid; ns int; earned boolean := false;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if my_role() is null then raise exception 'not allowed'; end if;
  select * into s from app_settings;
  select * into p from profiles where id=auth.uid() for update;
  select * into sess from checkin_sessions where not closed and expires_at>now()
    and (token=tok or (prev_token=tok and rotated_at>now()-interval '10 seconds')) limit 1;
  if sess.id is null then raise exception 'session closed'; end if;
  if p.last_visit = today then raise exception 'already today'; end if;
  insert into checkins(member_id,session_id,day) values (p.id,sess.id,today) returning id into cid;
  ns := case when p.last_visit = today-1 then p.streak+1 else 1 end;
  insert into points_ledger(member_id,delta,reason,checkin_id) values (p.id,s.points_per_visit,'visit',cid);
  if ns >= s.streak_target then insert into free_drinks(member_id) values (p.id); earned := true; ns := 0; end if;
  update profiles set streak=ns, last_visit=today where id=p.id;
  return json_build_object('points',s.points_per_visit,'streak',ns,'target',s.streak_target,'earned',earned);
end $$;

-- المشروب المجاني: الجمعة بس (بتوقيت القاهرة)، مرة لكل مشروب، كود يتأكد من الكاشير
create function claim_free_drink() returns text language plpgsql security definer set search_path=public as $$
declare did uuid; c text; today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if my_role() is null then raise exception 'not allowed'; end if;
  if extract(isodow from today) <> 5 then raise exception 'not friday'; end if;
  select code into c from free_drinks where member_id=auth.uid() and used_at is null and claimed_day=today limit 1;
  if c is not null then return c; end if;
  select id into did from free_drinks where member_id=auth.uid() and used_at is null and (code is null or claimed_day<today)
    order by earned_at limit 1 for update;
  if did is null then raise exception 'no drink'; end if;
  update free_drinks set code=upper(substr(md5(random()::text||did::text),1,6)), claimed_day=today where id=did returning code into c;
  return c; end $$;
create function use_drink(c text) returns text language plpgsql security definer set search_path=public as $$
declare m uuid; n text;
begin
  if my_role() not in ('staff','admin') then raise exception 'forbidden'; end if;
  update free_drinks set used_at=now() where code=upper(c) and used_at is null
    and claimed_day=(now() at time zone 'Africa/Cairo')::date returning member_id into m;
  if m is null then raise exception 'invalid'; end if;
  select display_name into n from profiles where id=m;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'use_drink',jsonb_build_object('member',m));
  return n; end $$;

create function get_leaderboard(period text, lim int default 10)
returns table(display_name text, points bigint, visits bigint) language sql stable security definer set search_path=public as $$
  select p.display_name, sum(l.delta)::bigint, count(*) filter (where l.reason='visit')::bigint
  from points_ledger l join profiles p on p.id=l.member_id
  where not p.suspended and case period
    when 'week' then l.created_at >= date_trunc('week', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
    when 'month' then l.created_at >= date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
    else true end
  group by p.id order by 2 desc, 3 desc limit least(lim,100) $$;
create function get_stats() returns json language sql stable security definer set search_path=public as $$
  select json_build_object('members',(select count(*) from profiles),
    'visits',(select count(*) from checkins where day >= date_trunc('month', now() at time zone 'Africa/Cairo')::date),
    'target',(select streak_target from app_settings)) $$;

revoke all on function open_session(int), rotate_session(), close_session(), scan_checkin(text),
  claim_free_drink(), use_drink(text), get_leaderboard(text,int), get_stats() from public;
grant execute on function open_session(int), rotate_session(), close_session(), scan_checkin(text),
  claim_free_drink(), use_drink(text) to authenticated;
grant execute on function get_leaderboard(text,int), get_stats() to anon, authenticated;
-- لتعيين أول أدمن/موظف: update profiles set role='admin' where username='اليوزر';

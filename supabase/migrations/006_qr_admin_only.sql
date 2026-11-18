-- توليد كود التسجيل وتدويره وقفله للأدمن فقط. الموظف بيفضل يأكّد المشروبات.
create or replace function open_session(mins int) returns checkin_sessions language plpgsql security definer set search_path=public as $$
declare r checkin_sessions;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if mins not between 1 and 30 then raise exception 'bad duration'; end if;
  update checkin_sessions set closed=true where not closed;
  insert into checkin_sessions(opened_by,token,expires_at)
    values (auth.uid(), replace(gen_random_uuid()::text,'-',''), now()+make_interval(mins=>mins)) returning * into r;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'open_session',jsonb_build_object('mins',mins));
  return r; end $$;
create or replace function rotate_session() returns checkin_sessions language plpgsql security definer set search_path=public as $$
declare r checkin_sessions;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  update checkin_sessions set prev_token=token, token=replace(gen_random_uuid()::text,'-',''), rotated_at=now()
    where not closed and expires_at>now() returning * into r;
  return r; end $$;
create or replace function close_session() returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  update checkin_sessions set closed=true where not closed;
  insert into audit_logs(actor,action) values (auth.uid(),'close_session'); end $$;

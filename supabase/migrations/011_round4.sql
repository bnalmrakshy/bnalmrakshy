-- شغّله بعد 010. حذف المستخدمين وتغيير الباسورد من قاعدة البيانات (من غير مفتاح service-role)، وحسابات ناقصة، ومدة QR الفاتورة.
create extension if not exists pgcrypto with schema extensions;

create or replace function admin_delete_user(uid uuid) returns void language plpgsql security definer set search_path=public as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if uid = auth.uid() then raise exception 'cannot delete self'; end if;
  select role into cur from profiles where id=uid;
  if cur = 'developer' or (cur = 'admin' and real_role() <> 'developer') then raise exception 'cannot delete this account'; end if;
  if not exists (select 1 from auth.users where id=uid) then raise exception 'not found'; end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'admin_delete_user',jsonb_build_object('target',uid,'username',(select username from profiles where id=uid)));
  delete from auth.users where id=uid;  -- cascade بيمسح البروفايل وكل بياناته، واليوزر والبريد بيتحرروا
end $$;

create or replace function admin_set_password(uid uuid, pw text) returns void language plpgsql security definer set search_path=public, extensions as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  select role into cur from profiles where id=uid;
  if cur is null or cur in ('admin','developer') or uid = auth.uid() then raise exception 'cannot change this account'; end if;
  if char_length(pw) not between 8 and 72 or pw !~ '[A-Za-z]' or pw !~ '[0-9]' then raise exception 'weak password'; end if;
  update auth.users set encrypted_password = crypt(pw, gen_salt('bf')), updated_at = now() where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'admin_set_password',jsonb_build_object('target',uid,'username',(select username from profiles where id=uid))); end $$;

create or replace function admin_orphan_accounts() returns table(id uuid, email text, created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select u.id, u.email::text, u.created_at from auth.users u where not exists (select 1 from profiles p where p.id=u.id) order by u.created_at; end $$;

drop function if exists create_invoice(jsonb);
create or replace function create_invoice(lines jsonb, mins int default 2) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; tot int:=0; pts int:=0; l jsonb; m menu_items; q int;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if mins not between 1 and 30 then raise exception 'bad duration'; end if;
  if jsonb_typeof(lines)<>'array' or jsonb_array_length(lines) not between 1 and 30 then raise exception 'bad lines'; end if;
  insert into invoices(token,created_by,expires_at) values (replace(gen_random_uuid()::text,'-',''),auth.uid(),now()+make_interval(mins=>mins)) returning * into inv;
  for l in select * from jsonb_array_elements(lines) loop
    q := (l->>'qty')::int; select * into m from menu_items where id=(l->>'id')::int and active;
    if m.id is null or q not between 1 and 100 then raise exception 'bad item'; end if;
    insert into invoice_items(invoice_id,item_id,name,qty,price,points) values (inv.id,m.id,m.name,q,m.price,m.points);
    tot := tot + m.price*q; pts := pts + m.points*q;
  end loop;
  update invoices set total=tot, points=pts where id=inv.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'create_invoice',jsonb_build_object('invoice',inv.id,'total',tot,'mins',mins));
  return json_build_object('id',inv.id,'token',inv.token,'total',tot,'points',pts,'expires_at',inv.expires_at); end $$;

revoke all on function admin_delete_user(uuid), admin_set_password(uuid,text), admin_orphan_accounts(), create_invoice(jsonb,int) from public;
grant execute on function admin_delete_user(uuid), admin_set_password(uuid,text), admin_orphan_accounts(), create_invoice(jsonb,int) to authenticated;

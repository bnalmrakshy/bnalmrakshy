-- شغّله بعد 009 (في تشغيل منفصل). الصورة الشخصية، تعديل الحساب، المطوّر، إدارة المنيو، أكتر العملاء تفاعلًا.
create or replace function my_role() returns role_t language sql stable security definer set search_path=public as
  $$ select case when role='developer' then 'admin'::role_t else role end from profiles where id=auth.uid() and not suspended $$;
create or replace function real_role() returns role_t language sql stable security definer set search_path=public as
  $$ select role from profiles where id=auth.uid() and not suspended $$;

create or replace function admin_set_role(uid uuid, r role_t) returns void language plpgsql security definer set search_path=public as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if r = 'developer' then raise exception 'cannot grant developer'; end if;
  select role into cur from profiles where id=uid;
  if cur is null then raise exception 'not found'; end if;
  if uid = auth.uid() or cur = 'developer' or (cur = 'admin' and real_role() <> 'developer') then raise exception 'cannot change this account'; end if;
  update profiles set role=r where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_role',jsonb_build_object('member',uid,'from',cur,'to',r)); end $$;
create or replace function admin_set_suspended(uid uuid, s boolean) returns void language plpgsql security definer set search_path=public as $$
declare cur role_t;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  select role into cur from profiles where id=uid;
  if cur is null then raise exception 'not found'; end if;
  if uid = auth.uid() or cur = 'developer' or (cur = 'admin' and real_role() <> 'developer') then raise exception 'cannot change this account'; end if;
  update profiles set suspended=s where id=uid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'set_suspended',jsonb_build_object('member',uid,'suspended',s)); end $$;

-- تسجيل الدخول باليوزر الحالي حتى لو اتغيّر (بيرجّع إيميل الحساب الأصلي، ولو مفيش بيرجّع إيميل افتراضي مش موجود)
create or replace function login_email(u text) returns text language sql stable security definer set search_path=public as $$
  select coalesce((select a.email from auth.users a join profiles p on p.id=a.id where p.username=lower(trim(u))), lower(trim(u))||'@users.almarrakshi.app') $$;
grant execute on function login_email(text) to anon, authenticated;

create or replace function update_profile(new_name text, new_username text) returns void language plpgsql security definer set search_path=public as $$
declare p profiles;
begin
  if my_role() is null then raise exception 'not allowed'; end if;
  select * into p from profiles where id=auth.uid() for update;
  new_name := trim(new_name); new_username := lower(trim(new_username));
  if char_length(new_name) not between 2 and 24 then raise exception 'bad name'; end if;
  if new_username !~ '^[a-z0-9_]{3,20}$' then raise exception 'bad username'; end if;
  if new_username <> p.username then
    if p.username_changed_at is not null and p.username_changed_at > now() - interval '7 days' then raise exception 'too soon'; end if;
    if exists (select 1 from profiles where username=new_username) then raise exception 'taken'; end if;
    update profiles set username=new_username, username_changed_at=now() where id=p.id;
  end if;
  update profiles set display_name=new_name where id=p.id; end $$;
create or replace function set_avatar(url text) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is null then raise exception 'not allowed'; end if;
  if url not like 'https://%' or position('/storage/v1/object/public/avatars/'||auth.uid()::text||'/' in url)=0 then raise exception 'bad url'; end if;
  update profiles set avatar_url=url where id=auth.uid(); end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',true,1048576,array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set public=true, file_size_limit=1048576, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists av_read on storage.objects; drop policy if exists av_ins on storage.objects; drop policy if exists av_upd on storage.objects;
create policy av_read on storage.objects for select using (bucket_id='avatars');
create policy av_ins on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy av_upd on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists m_admin_read on menu_items;
create policy m_admin_read on menu_items for select using (my_role()='admin');
create or replace function admin_update_item(iid int, newprice int, newpoints int, isactive boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if newprice < 1 or newprice > 100000 or newpoints < 0 or newpoints > 100000 then raise exception 'bad values'; end if;
  update menu_items set price=newprice, points=newpoints, active=isactive where id=iid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'update_item',jsonb_build_object('item',iid,'price',newprice,'points',newpoints,'active',isactive)); end $$;
create or replace function admin_add_item(cat text, nm text, pr int, pts int) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if trim(cat)='' or trim(nm)='' or pr < 1 or pr > 100000 or pts < 0 or pts > 100000 then raise exception 'bad values'; end if;
  insert into menu_items(category,name,price,points) values (trim(cat),trim(nm),pr,pts);
  insert into audit_logs(actor,action,detail) values (auth.uid(),'add_item',jsonb_build_object('name',trim(nm),'price',pr)); end $$;

create or replace function admin_top_customers(lim int default 10)
returns table(display_name text, visits bigint, spent bigint, points bigint) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  return query select p.display_name,
    (select count(*) from checkins c where c.member_id=p.id and c.day >= (now() at time zone 'Africa/Cairo')::date - 29)::bigint,
    coalesce((select sum(i.total) from invoices i where i.claimed_by=p.id),0)::bigint,
    coalesce((select sum(l.delta) from points_ledger l where l.member_id=p.id),0)::bigint
  from profiles p where p.role='member' and not p.suspended order by 2 desc, 3 desc limit least(lim,50); end $$;

revoke all on function real_role(), update_profile(text,text), set_avatar(text), admin_update_item(int,int,int,boolean), admin_add_item(text,text,int,int), admin_top_customers(int) from public;
grant execute on function update_profile(text,text), set_avatar(text), admin_update_item(int,int,int,boolean), admin_add_item(text,text,int,int), admin_top_customers(int) to authenticated;
-- أول مطوّر (حسابك): update profiles set role='developer' where username='اليوزر';

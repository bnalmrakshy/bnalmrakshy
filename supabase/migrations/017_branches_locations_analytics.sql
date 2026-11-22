-- الفروع + مناطق العملاء (بموافقة العميل وبشكل تقريبي) + أساس التحليلات. شغّله بعد 016.
create table if not exists branches (id serial primary key, name text not null, address text, lat double precision not null, lng double precision not null, maps_url text, active boolean not null default true);
insert into branches(name,address,lat,lng,maps_url)
  select * from (values ('الفرع الأول','الزلزال مول الزعيم، أمام فرع فودافون',30.141143::double precision,31.720104::double precision,'https://maps.app.goo.gl/9BRvA8wzEv5Qq9sN7'),
                        ('الفرع الثاني','أمام الجامعة الروسية، بجوار بنك QNB',30.141457::double precision,31.7296317::double precision,'https://maps.app.goo.gl/JT2i82RSHN2eV3R88')) v(n,a,la,lo,u)
  where not exists (select 1 from branches);
create table if not exists areas (id serial primary key, name text not null unique, active boolean not null default true);
insert into areas(name) values ('خارج مدينة بدر'),('أخرى') on conflict do nothing;
create table if not exists member_locations (member_id uuid primary key references profiles on delete cascade, area_id int references areas, lat_grid double precision, lng_grid double precision,
  nearest_branch int references branches, dist_km numeric(6,2), source text not null check (source in ('gps','manual','skipped')), consent_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table app_settings add column if not exists delivery_radius_km numeric not null default 3, add column if not exists analytics_salt text not null default replace(gen_random_uuid()::text,'-','');
alter table shifts add column if not exists branch_id int references branches;
alter table invoices add column if not exists branch_id int references branches;
alter table branches enable row level security; alter table areas enable row level security; alter table member_locations enable row level security;
drop policy if exists br_read on branches; create policy br_read on branches for select using (true);
drop policy if exists ar_read on areas; create policy ar_read on areas for select using (active or is_admin());
drop policy if exists ml_read on member_locations; create policy ml_read on member_locations for select using (member_id=auth.uid() or is_admin());
grant select on branches, areas to anon, authenticated; grant select on member_locations to authenticated;

create or replace function set_invoice_branch() returns trigger language plpgsql as $$
begin if new.shift_id is not null then select branch_id into new.branch_id from shifts where id=new.shift_id; end if; return new; end $$;
drop trigger if exists inv_branch on invoices; create trigger inv_branch before insert or update of shift_id on invoices for each row execute function set_invoice_branch();
update invoices i set branch_id = s.branch_id from shifts s where s.id=i.shift_id and i.branch_id is null;

drop function if exists open_shift(numeric);
create or replace function open_shift(opening numeric, p_branch int default null) returns int language plpgsql security definer set search_path=public as $$
declare sid int; nm text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if opening < 0 then raise exception 'bad amount'; end if;
  if p_branch is not null and not exists (select 1 from branches where id=p_branch and active) then raise exception 'bad branch'; end if;
  select id into sid from shifts where cashier_id=auth.uid() and closed_at is null;
  if sid is not null then return sid; end if;
  select display_name into nm from profiles where id=auth.uid();
  insert into shifts(cashier_id,cashier_name,opening_cash,branch_id) values (auth.uid(),nm,opening,p_branch) returning id into sid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'open_shift',jsonb_build_object('shift',sid,'opening',opening,'branch',p_branch));
  return sid; end $$;

create or replace function haversine_km(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision) returns double precision language sql immutable as $$
  select 2*6371*asin(sqrt(sin(radians(b_lat-a_lat)/2)^2 + cos(radians(a_lat))*cos(radians(b_lat))*sin(radians(b_lng-a_lng)/2)^2)) $$;

-- الموقع اختياري وبموافقة العميل: بنحفظ المنطقة أو إحداثيات مقرّبة (~٥٠٠ متر) مش عنوانه بالظبط
create or replace function set_my_location(p_area int default null, p_lat double precision default null, p_lng double precision default null) returns json language plpgsql security definer set search_path=public as $$
declare gl double precision; gn double precision; bid int; bd numeric; src text;
begin
  if my_role() is null then raise exception 'not allowed'; end if;
  if p_lat is not null and p_lng is not null and p_lat between 21 and 32 and p_lng between 24 and 37 then
    gl := round(p_lat/0.005)*0.005; gn := round(p_lng/0.005)*0.005; src := 'gps';
    select id, round(haversine_km(gl,gn,lat,lng)::numeric,2) into bid, bd from branches where active order by haversine_km(gl,gn,lat,lng) limit 1;
  elsif p_area is not null and exists (select 1 from areas where id=p_area and active) then src := 'manual';
  else raise exception 'bad location'; end if;
  insert into member_locations(member_id,area_id,lat_grid,lng_grid,nearest_branch,dist_km,source) values (auth.uid(),p_area,gl,gn,bid,bd,src)
  on conflict (member_id) do update set area_id=excluded.area_id, lat_grid=excluded.lat_grid, lng_grid=excluded.lng_grid, nearest_branch=excluded.nearest_branch, dist_km=excluded.dist_km, source=excluded.source, consent_at=now(), updated_at=now();
  return json_build_object('branch',bid,'dist_km',bd); end $$;
create or replace function skip_location() returns void language plpgsql security definer set search_path=public as $$
begin if my_role() is null then raise exception 'not allowed'; end if;
  insert into member_locations(member_id,source) values (auth.uid(),'skipped') on conflict (member_id) do nothing; end $$;
create or replace function clear_my_location() returns void language plpgsql security definer set search_path=public as $$
begin if my_role() is null then raise exception 'not allowed'; end if; delete from member_locations where member_id=auth.uid(); end $$;
create or replace function admin_add_area(p_name text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'forbidden'; end if; insert into areas(name) values (trim(p_name)) on conflict (name) do update set active=true; end $$;

create or replace function area_stats() returns json language plpgsql stable security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return json_build_object('members',(select count(*) from profiles where role='member'),'with_location',(select count(*) from member_locations where source<>'skipped'),
    'radius',(select delivery_radius_km from app_settings where id=1),
    'in_radius',(select count(*) from member_locations l, app_settings s where s.id=1 and l.dist_km is not null and l.dist_km <= s.delivery_radius_km),
    'by_area',(select coalesce(json_agg(x),'[]') from (select coalesce(a.name,'من الموقع الجغرافي') as name, count(*) as n from member_locations l left join areas a on a.id=l.area_id where l.source<>'skipped' group by 1 order by 2 desc) x),
    'by_branch',(select coalesce(json_agg(x),'[]') from (select b.name, count(*) as n from member_locations l join branches b on b.id=l.nearest_branch group by b.name order by 2 desc) x),
    'buckets',(select coalesce(json_agg(x order by x.ord),'[]') from (select case when dist_km<0.5 then 1 when dist_km<1 then 2 when dist_km<2 then 3 when dist_km<5 then 4 else 5 end as ord,
        case when dist_km<0.5 then 'أقل من ٠٫٥ كم' when dist_km<1 then '٠٫٥ إلى ١ كم' when dist_km<2 then '١ إلى ٢ كم' when dist_km<5 then '٢ إلى ٥ كم' else 'أكتر من ٥ كم' end as bucket, count(*) as n
        from member_locations where dist_km is not null group by 1,2) x)); end $$;

-- تصدير بيانات التحليل: أسماء مستعارة (hash) من غير أسماء أو يوزرات أو تليفونات، والموقع مقرّب
create or replace function analytics_export() returns json language plpgsql stable security definer set search_path=public, extensions as $$
declare salt text;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select analytics_salt into salt from app_settings where id=1;
  return json_build_object('meta', json_build_object('exported_at', now(), 'note', 'pseudonymized; no names/usernames/phones; location rounded to ~500m'),
    'dim_branches', (select coalesce(json_agg(t),'[]') from (select id, name, lat, lng from branches) t),
    'dim_items', (select coalesce(json_agg(t),'[]') from (select id, category, name, price, cost, points, active from menu_items) t),
    'dim_members', (select coalesce(json_agg(t),'[]') from (select encode(digest(p.id::text||salt,'sha256'),'hex') as member_key, (p.created_at at time zone 'Africa/Cairo')::date as joined_date, a.name as area, l.lat_grid, l.lng_grid, l.nearest_branch, l.dist_km, p.streak
        from profiles p left join member_locations l on l.member_id=p.id and l.source<>'skipped' left join areas a on a.id=l.area_id where p.role='member') t),
    'fact_sales', (select coalesce(json_agg(t),'[]') from (select substr(encode(digest(i.id::text||salt,'sha256'),'hex'),1,16) as sale_key, (i.paid_at at time zone 'Africa/Cairo') as sold_at_local, (i.paid_at at time zone 'Africa/Cairo')::date as sale_date,
        extract(hour from i.paid_at at time zone 'Africa/Cairo')::int as hour, extract(isodow from i.paid_at at time zone 'Africa/Cairo')::int as weekday, i.branch_id, i.payment_method, i.total, i.discount, i.paid_amount, coalesce(c.cost,0) as cost,
        case when i.claimed_by is null then null else encode(digest(i.claimed_by::text||salt,'sha256'),'hex') end as member_key, i.points_earned
        from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true where i.status='paid') t),
    'fact_sale_items', (select coalesce(json_agg(t),'[]') from (select substr(encode(digest(i.id::text||salt,'sha256'),'hex'),1,16) as sale_key, ii.item_id, ii.name as item_name, ii.qty, ii.price as unit_price, ii.cost as unit_cost
        from invoice_items ii join invoices i on i.id=ii.invoice_id where i.status='paid') t),
    'fact_points', (select coalesce(json_agg(t),'[]') from (select encode(digest(l.member_id::text||salt,'sha256'),'hex') as member_key, l.delta, l.reason, (l.created_at at time zone 'Africa/Cairo') as at_local from points_ledger l) t)); end $$;

revoke all on function set_my_location(int,double precision,double precision), skip_location(), clear_my_location(), admin_add_area(text), area_stats(), analytics_export(), open_shift(numeric,int) from public;
grant execute on function set_my_location(int,double precision,double precision), skip_location(), clear_my_location(), admin_add_area(text), area_stats(), analytics_export(), open_shift(numeric,int) to authenticated;
grant execute on function is_admin(), is_staff() to anon;

-- التشغيل الكامل: أسماء الفروع + مناطق بدر والتوصيل + مخزون الفروع + قيود يدوية وإقفال فترات + التزام نقاط الولاء + بيع أوفلاين. شغّله بعد 018.
update branches set name='الفرع الأول — الزلزال' where maps_url like '%9BRvA8wzEv5Qq9sN7%';
update branches set name='الفرع الثاني — الجامعة الروسية' where maps_url like '%JT2i82RSHN2eV3R88%';
create or replace function admin_save_branch(p_id int, p_name text, p_address text, p_lat double precision, p_lng double precision, p_maps text, p_active boolean) returns int language plpgsql security definer set search_path=public as $$
declare bid int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if trim(coalesce(p_name,''))='' or p_lat not between 21 and 32 or p_lng not between 24 and 37 then raise exception 'bad values'; end if;
  if p_id is null then insert into branches(name,address,lat,lng,maps_url,active) values (trim(p_name),p_address,p_lat,p_lng,p_maps,coalesce(p_active,true)) returning id into bid;
  else update branches set name=trim(p_name), address=p_address, lat=p_lat, lng=p_lng, maps_url=p_maps, active=coalesce(p_active,true) where id=p_id returning id into bid; end if;
  return bid; end $$;

alter table areas add column if not exists district text, add column if not exists delivery_enabled boolean not null default false, add column if not exists delivery_fee int not null default 0,
  add column if not exists min_order int not null default 0, add column if not exists branch_id int references branches;
-- مناطق مدينة بدر من عناوين صفحات الخريطة (راجعها وعدّلها من الإعدادات)
insert into areas(name,district) select n,d from (values
 ('الحي الأول — مجاورة ١','الحي الأول'),('الحي الأول — مجاورة ٢','الحي الأول'),('الحي الأول — مجاورة ٣','الحي الأول'),('الحي الأول — مجاورة ٤','الحي الأول'),('الحي الأول — مجاورة ٥','الحي الأول'),
 ('الحي الثاني — مجاورة ١','الحي الثاني'),('الحي الثاني — مجاورة ٢','الحي الثاني'),('الحي الثاني — مجاورة ٣','الحي الثاني'),('الحي الثاني — مجاورة ٤','الحي الثاني'),('الحي الثاني — مجاورة ٥','الحي الثاني'),
 ('الحي الثالث — مجاورة ١','الحي الثالث'),('الحي الثالث — مجاورة ٢','الحي الثالث'),('الحي الثالث — مجاورة ٣','الحي الثالث'),('الحي الثالث — مجاورة ٤','الحي الثالث'),('الحي الثالث — مجاورة ٥','الحي الثالث'),
 ('الحي الرابع','الحي الرابع'),('الحي الرابع — د القديمة','الحي الرابع'),('الحي الرابع — د الجديدة','الحي الرابع'),
 ('الحي المتميز — فيلات','الحي المتميز'),('الحي المتميز — عمارات','الحي المتميز'),('المتميز الجديد','الحي المتميز'),
 ('مسلسل ١','المسلسلات'),('مسلسل ٢','المسلسلات'),('مسلسل ٣','المسلسلات'),('مسلسل ٤','المسلسلات'),('شمال المدينة الجديد','شمال المدينة'),('المنطقة الصناعية','صناعي')) v(n,d)
on conflict (name) do nothing;
create or replace function admin_save_area(p_id int, p_name text, p_district text, p_enabled boolean, p_fee int, p_min int, p_branch int, p_active boolean) returns int language plpgsql security definer set search_path=public as $$
declare aid int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if trim(coalesce(p_name,''))='' or p_fee < 0 or p_fee > 1000 or p_min < 0 then raise exception 'bad values'; end if;
  if p_id is null then insert into areas(name,district,delivery_enabled,delivery_fee,min_order,branch_id,active) values (trim(p_name),p_district,coalesce(p_enabled,false),p_fee,p_min,p_branch,coalesce(p_active,true)) returning id into aid;
  else update areas set name=trim(p_name), district=p_district, delivery_enabled=coalesce(p_enabled,false), delivery_fee=p_fee, min_order=p_min, branch_id=p_branch, active=coalesce(p_active,true) where id=p_id returning id into aid; end if;
  return aid; end $$;
create or replace function admin_set_radius(p_km numeric) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() or p_km <= 0 or p_km > 50 then raise exception 'forbidden'; end if; update app_settings set delivery_radius_km=p_km where id=1; end $$;

-- طلبات التوصيل
create table if not exists orders (id uuid primary key default gen_random_uuid(), order_no bigserial, member_id uuid references profiles on delete set null, branch_id int references branches, area_id int references areas,
  address text not null, phone text not null, note text, subtotal int not null, fee int not null default 0, total int not null, payment_method text,
  status text not null default 'new' check (status in ('new','preparing','on_way','delivered','cancelled')), invoice_id uuid references invoices on delete set null, cancel_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists order_items (id bigserial primary key, order_id uuid not null references orders on delete cascade, item_id int references menu_items on delete set null, name text not null, qty int not null check (qty between 1 and 50), price int not null, points int not null default 0, cost numeric(12,2) not null default 0);
create index if not exists orders_status on orders(status, created_at desc);
alter table orders enable row level security; alter table order_items enable row level security;
drop policy if exists o_read on orders; create policy o_read on orders for select using (member_id=auth.uid() or is_staff());
drop policy if exists oi_read on order_items; create policy oi_read on order_items for select using (exists (select 1 from orders o where o.id=order_id and (o.member_id=auth.uid() or is_staff())));
grant select on orders, order_items to authenticated;

create or replace function place_order(p_lines jsonb, p_area int, p_address text, p_phone text, p_note text default null) returns json language plpgsql security definer set search_path=public as $$
declare a areas; oid uuid; ono bigint; sub int:=0; l jsonb; m menu_items; q int; br int;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into a from areas where id=p_area and active and delivery_enabled; if a.id is null then raise exception 'area not available'; end if;
  if char_length(trim(coalesce(p_address,''))) < 5 or char_length(regexp_replace(coalesce(p_phone,''),'\D','','g')) < 10 then raise exception 'bad contact'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 30 then raise exception 'bad lines'; end if;
  if (select count(*) from orders where member_id=auth.uid() and status in ('new','preparing','on_way')) >= 3 then raise exception 'too many open orders'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    q := (l->>'qty')::int; select * into m from menu_items where id=(l->>'id')::int and active;
    if m.id is null or q not between 1 and 50 then raise exception 'bad item'; end if; sub := sub + m.price*q; end loop;
  if sub < a.min_order then raise exception 'below minimum'; end if;
  br := coalesce(a.branch_id, (select id from branches where active order by id limit 1));
  insert into orders(member_id,branch_id,area_id,address,phone,note,subtotal,fee,total) values (auth.uid(),br,a.id,trim(p_address),trim(p_phone),nullif(trim(coalesce(p_note,'')),''),sub,a.delivery_fee,sub+a.delivery_fee) returning id, order_no into oid, ono;
  for l in select * from jsonb_array_elements(p_lines) loop
    select * into m from menu_items where id=(l->>'id')::int;
    insert into order_items(order_id,item_id,name,qty,price,points,cost) values (oid,m.id,m.name,(l->>'qty')::int,m.price,m.points,m.cost); end loop;
  return json_build_object('id',oid,'no',ono,'total',sub+a.delivery_fee); end $$;

create or replace function cancel_my_order(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin update orders set status='cancelled', cancel_reason='العميل', updated_at=now() where id=p_id and member_id=auth.uid() and status='new';
  if not found then raise exception 'cannot cancel'; end if; end $$;

-- تغيير حالة الطلب. عند «تم التسليم» بيتعمل فاتورة مدفوعة مربوطة بالعميل وبتتحسب نقاطه والمخزون والخزنة والقيود.
create or replace function set_order_status(p_id uuid, p_status text, p_method text default 'cash', p_reason text default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders; sh int; iid uuid; pts int:=0; r record; today date := (now() at time zone 'Africa/Cairo')::date; p profiles;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select * into o from orders where id=p_id for update; if o.id is null then raise exception 'not found'; end if;
  if not ((o.status='new' and p_status in ('preparing','cancelled')) or (o.status='preparing' and p_status in ('on_way','cancelled')) or (o.status='on_way' and p_status in ('delivered','cancelled'))) then raise exception 'bad transition'; end if;
  if p_status='delivered' then
    if p_method not in ('cash','card','instapay') then raise exception 'bad method'; end if;
    select id into sh from shifts where cashier_id=auth.uid() and closed_at is null; if sh is null then raise exception 'no open shift'; end if;
    select coalesce(sum(points*qty),0) into pts from order_items where order_id=o.id;
    insert into invoices(token,created_by,shift_id,expires_at,total,points,claimed_by,claimed_at,points_earned) values (replace(gen_random_uuid()::text,'-',''),auth.uid(),sh,now(),o.total,pts,o.member_id,now(),pts) returning id into iid;
    insert into invoice_items(invoice_id,item_id,name,qty,price,points,cost) select iid,item_id,name,qty,price,points,cost from order_items where order_id=o.id;
    if o.fee > 0 then insert into invoice_items(invoice_id,item_id,name,qty,price,points,cost) values (iid,null,'رسوم توصيل',1,o.fee,0,0); end if;
    if pts > 0 and o.member_id is not null then insert into points_ledger(member_id,delta,reason,invoice_id) values (o.member_id,pts,'invoice',iid); end if;
    if o.member_id is not null then
      select * into p from profiles where id=o.member_id for update;
      if p.last_visit is distinct from today then insert into checkins(member_id,day) values (p.id,today); update profiles set streak = case when p.last_visit = today-1 then p.streak+1 else 1 end, last_visit=today where id=p.id; end if; end if;
    perform pay_invoice(iid, p_method, null);
    update orders set invoice_id=iid, payment_method=p_method where id=o.id;
  end if;
  update orders set status=p_status, cancel_reason=case when p_status='cancelled' then coalesce(p_reason,'من الكاشير') else cancel_reason end, updated_at=now() where id=o.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'order_'||p_status,jsonb_build_object('order',o.id,'no',o.order_no)); end $$;

-- مخزون الفروع (من حركات المخزون) + نقل بين الفروع
alter table stock_moves add column if not exists branch_id int references branches;
create or replace function trg_stock_branch() returns trigger language plpgsql as $$
begin if new.branch_id is null and new.reason in ('sale','sale_return') and new.ref ~ '^[0-9a-f-]{36}$' then select branch_id into new.branch_id from invoices where id=new.ref::uuid; end if; return new; end $$;
drop trigger if exists stk_branch on stock_moves; create trigger stk_branch before insert on stock_moves for each row execute function trg_stock_branch();
create or replace function branch_stock() returns table(item_id int, branch_id int, qty bigint) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if; return query select m.item_id, m.branch_id, sum(m.qty_delta)::bigint from stock_moves m group by m.item_id, m.branch_id; end $$;
create or replace function adjust_branch_stock(p_item int, p_branch int, p_qty int, p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare cur bigint; begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select coalesce(sum(qty_delta),0) into cur from stock_moves where item_id=p_item and branch_id is not distinct from p_branch;
  insert into stock_moves(item_id,qty_delta,reason,ref,created_by,branch_id) values (p_item,p_qty-cur,'count',p_note,auth.uid(),p_branch);
  update menu_items set stock = stock + (p_qty - cur) where id=p_item; end $$;
create or replace function transfer_stock(p_item int, p_from int, p_to int, p_qty int, p_note text default null) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() or p_qty < 1 or p_from is not distinct from p_to then raise exception 'bad values'; end if;
  insert into stock_moves(item_id,qty_delta,reason,ref,created_by,branch_id) values (p_item,-p_qty,'transfer',p_note,auth.uid(),p_from),(p_item,p_qty,'transfer',p_note,auth.uid(),p_to); end $$;

-- محاسبة: إقفال فترات + قيود يدوية + التزام نقاط الولاء
insert into gl_accounts(code,name,type,system) values ('2300','التزام نقاط الولاء','liability',true),('5300','تكلفة برنامج الولاء','expense',true) on conflict (code) do nothing;
alter table app_settings add column if not exists accounting_locked_until date;
create or replace function post_entry(p_source text, p_source_id text, p_memo text, p_branch int, p_lines jsonb, p_date date default null) returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint; l jsonb; d numeric:=0; c numeric:=0; dt date := coalesce(p_date,(now() at time zone 'Africa/Cairo')::date);
begin
  if exists (select 1 from app_settings where id=1 and accounting_locked_until is not null and dt <= accounting_locked_until) then raise exception 'period locked'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop d := d + coalesce((l->>'debit')::numeric,0); c := c + coalesce((l->>'credit')::numeric,0); end loop;
  if round(d,2) <> round(c,2) then raise exception 'unbalanced entry'; end if;
  if d = 0 then return null; end if;
  insert into journal_entries(entry_date,memo,source,source_id,branch_id,created_by) values (dt,p_memo,p_source,p_source_id,p_branch,auth.uid()) returning id into eid;
  insert into journal_lines(entry_id,account_id,debit,credit) select eid, gl(x->>'code'), coalesce((x->>'debit')::numeric,0), coalesce((x->>'credit')::numeric,0)
    from jsonb_array_elements(p_lines) x where coalesce((x->>'debit')::numeric,0) + coalesce((x->>'credit')::numeric,0) > 0;
  return eid; end $$;
create or replace function lock_period(p_date date) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() or p_date >= (now() at time zone 'Africa/Cairo')::date then raise exception 'bad date'; end if;
  update app_settings set accounting_locked_until=p_date where id=1; insert into audit_logs(actor,action,detail) values (auth.uid(),'lock_period',jsonb_build_object('until',p_date)); end $$;
create or replace function post_manual_entry(p_date date, p_memo text, p_lines jsonb) returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint; x jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) < 2 then raise exception 'bad lines'; end if;
  for x in select * from jsonb_array_elements(p_lines) loop if not exists (select 1 from gl_accounts where code=x->>'code' and active) then raise exception 'bad account'; end if; end loop;
  eid := post_entry('manual', null, coalesce(nullif(trim(p_memo),''),'قيد يدوي'), null, p_lines, p_date);
  if eid is null then raise exception 'empty entry'; end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'manual_entry',jsonb_build_object('entry',eid)); return eid; end $$;
create or replace function list_journal(lim int default 60) returns table(id bigint, entry_date date, memo text, source text, amount numeric) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if;
  return query select e.id, e.entry_date, e.memo, e.source, coalesce(sum(l.debit),0) from journal_entries e left join journal_lines l on l.entry_id=e.id group by e.id order by e.entry_date desc, e.id desc limit least(lim,300); end $$;
create or replace function post_points_row(l points_ledger) returns void language plpgsql security definer set search_path=public as $$
declare rate int; v numeric; d date := (l.created_at at time zone 'Africa/Cairo')::date;
begin
  select points_per_egp into rate from app_settings where id=1; v := round(abs(l.delta)::numeric / rate, 2); if v = 0 then return; end if;
  if l.reason='invoice' then perform post_entry('points', l.id::text, 'نقاط ولاء ممنوحة', null, jsonb_build_array(jsonb_build_object('code','5300','debit',v), jsonb_build_object('code','2300','credit',v)), d);
  elsif l.reason='redeem' then perform post_entry('points', l.id::text, 'نقاط ولاء مستبدلة', null, jsonb_build_array(jsonb_build_object('code','2300','debit',v), jsonb_build_object('code','4200','credit',v)), d);
  elsif l.reason='invoice_refund' then perform post_entry('points', l.id::text, 'سحب نقاط (استرجاع)', null, jsonb_build_array(jsonb_build_object('code','2300','debit',v), jsonb_build_object('code','5300','credit',v)), d);
  elsif l.reason='redeem_refund' then perform post_entry('points', l.id::text, 'رد نقاط (استرجاع)', null, jsonb_build_array(jsonb_build_object('code','4200','debit',v), jsonb_build_object('code','2300','credit',v)), d); end if; end $$;
create or replace function trg_points() returns trigger language plpgsql security definer set search_path=public as $$ begin perform post_points_row(new); return new; end $$;
drop trigger if exists post_points on points_ledger; create trigger post_points after insert on points_ledger for each row execute function trg_points();
do $$ declare r points_ledger; begin
  for r in select * from points_ledger l where l.reason in ('invoice','redeem','invoice_refund','redeem_refund') and not exists (select 1 from journal_entries e where e.source='points' and e.source_id=l.id::text) loop perform post_points_row(r); end loop; end $$;

-- بيع أوفلاين: بيتبعت لما النت يرجع (بيمنع التكرار بـ client_id)
create table if not exists offline_sales (client_id uuid primary key, invoice_id uuid references invoices on delete set null, created_by uuid, created_at timestamptz not null default now());
alter table offline_sales enable row level security;
create or replace function record_offline_sale(p_client uuid, p_lines jsonb, p_method text, p_paid_at timestamptz) returns json language plpgsql security definer set search_path=public as $$
declare iid uuid; r json; at timestamptz := least(coalesce(p_paid_at, now()), now());
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_method not in ('cash','card','instapay') then raise exception 'bad method'; end if;
  insert into offline_sales(client_id,created_by) values (p_client,auth.uid()) on conflict do nothing;
  if not found then return json_build_object('dup',true); end if;
  r := create_invoice(p_lines, 1); iid := (r->>'id')::uuid; perform pay_invoice(iid, p_method, null);
  update invoices set paid_at=at where id=iid;
  update journal_entries set entry_date=(at at time zone 'Africa/Cairo')::date where source='sale' and source_id=iid::text and (select accounting_locked_until from app_settings where id=1) is null;
  update offline_sales set invoice_id=iid where client_id=p_client; return json_build_object('dup',false,'id',iid); end $$;

drop function if exists dashboard_data(date,date,int); drop function if exists dash_kpis(timestamptz,timestamptz,int); drop function if exists report_data(date,date,int);
create or replace function dash_kpis(f timestamptz, e timestamptz, sh int, br int default null) returns json language sql stable security definer set search_path=public as $$
  select json_build_object(
    'sales', coalesce(sum(i.paid_amount),0), 'count', count(i.id), 'discount', coalesce(sum(i.discount),0),
    'profit', coalesce(sum(i.paid_amount - coalesce(c.cost,0)),0), 'customers', count(distinct i.claimed_by),
    'members', (select count(*) from profiles p where p.role='member' and p.created_at>=f and p.created_at<e),
    'issued', (select coalesce(sum(delta),0) from points_ledger where reason='invoice' and created_at>=f and created_at<e),
    'redeemed', (select coalesce(-sum(delta),0) from points_ledger where reason='redeem' and created_at>=f and created_at<e))
  from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
  where i.status='paid' and i.paid_at>=f and i.paid_at<e and (sh is null or i.shift_id=sh) and (br is null or i.branch_id=br) $$;

create or replace function dashboard_data(d_from date, d_to date, p_shift int default null, p_branch int default null) returns json language plpgsql stable security definer set search_path=public as $$
declare f timestamptz := d_from::timestamp at time zone 'Africa/Cairo'; e timestamptz := (d_to+1)::timestamp at time zone 'Africa/Cairo';
  len int := d_to - d_from + 1; pf timestamptz := (d_from-(d_to - d_from + 1))::timestamp at time zone 'Africa/Cairo'; res json;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if d_to < d_from or len > 400 then raise exception 'bad range'; end if;
  select json_build_object(
    'kpi', dash_kpis(f,e,p_shift,p_branch), 'prev', dash_kpis(pf,f,p_shift,p_branch),
    'daily', (select coalesce(json_agg(x order by x.d),'[]') from (select (i.paid_at at time zone 'Africa/Cairo')::date as d, sum(i.paid_amount) as sales, count(*) as n, sum(i.paid_amount - coalesce(c.cost,0)) as profit
        from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1) x),
    'by_hour', (select coalesce(json_agg(x order by x.h),'[]') from (select extract(hour from i.paid_at at time zone 'Africa/Cairo')::int as h, sum(i.paid_amount) as sales, count(*) as n, sum(i.paid_amount - coalesce(c.cost,0)) as profit
        from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1) x),
    'by_weekday', (select coalesce(json_agg(x order by x.w),'[]') from (select extract(isodow from i.paid_at at time zone 'Africa/Cairo')::int as w, sum(i.paid_amount) as sales, count(*) as n
        from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1) x),
    'by_method', (select coalesce(json_agg(x),'[]') from (select i.payment_method as method, count(*) as n, sum(i.paid_amount) as amount from invoices i
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1 order by 3 desc) x),
    'by_cashier', (select coalesce(json_agg(x),'[]') from (select s.cashier_name as name, count(*) as n, sum(i.paid_amount) as amount from invoices i join shifts s on s.id=i.shift_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1 order by 3 desc) x),
    'by_category', (select coalesce(json_agg(x),'[]') from (select coalesce(m.category,'أخرى') as name, sum(ii.qty*ii.price) as revenue from invoice_items ii join invoices i on i.id=ii.invoice_id left join menu_items m on m.id=ii.item_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1 order by 2 desc) x),
    'items', (select coalesce(json_agg(x),'[]') from (select ii.name, sum(ii.qty) as qty, sum(ii.qty*ii.price) as revenue, sum(ii.qty*(ii.price-ii.cost)) as profit from invoice_items ii join invoices i on i.id=ii.invoice_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by ii.name order by 3 desc limit 40) x),
    'members', (select coalesce(json_agg(x order by x.d),'[]') from (select (p.created_at at time zone 'Africa/Cairo')::date as d, count(*) as n from profiles p where p.role='member' and p.created_at>=f and p.created_at<e group by 1) x),
    'points', (select coalesce(json_agg(x order by x.d),'[]') from (select (l.created_at at time zone 'Africa/Cairo')::date as d, coalesce(sum(case when l.reason='invoice' then l.delta end),0) as issued, coalesce(sum(case when l.reason='redeem' then -l.delta end),0) as redeemed
        from points_ledger l where l.created_at>=f and l.created_at<e group by 1) x),
    'top_customers', (select coalesce(json_agg(x),'[]') from (select pr.display_name, sum(i.paid_amount) as spent, count(*) as visits from invoices i join profiles pr on pr.id=i.claimed_by
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by pr.id order by 2 desc limit 10) x)
  ) into res; return res; end $$;

create or replace function report_data(d_from date, d_to date, p_shift int default null, p_branch int default null) returns json language plpgsql stable security definer set search_path=public as $$
declare f timestamptz := d_from::timestamp at time zone 'Africa/Cairo'; e timestamptz := (d_to+1)::timestamp at time zone 'Africa/Cairo'; res json;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select json_build_object(
    'summary', (select json_build_object('sales',coalesce(sum(i.paid_amount),0),'count',count(*),'gross',coalesce(sum(i.total),0),'discount',coalesce(sum(i.discount),0),
       'cost',coalesce((select sum(ii.cost*ii.qty) from invoice_items ii join invoices i2 on i2.id=ii.invoice_id where i2.status='paid' and i2.paid_at>=f and i2.paid_at<e and (p_shift is null or i2.shift_id=p_shift) and (p_branch is null or i2.branch_id=p_branch)),0))
       from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch)),
    'by_method', (select coalesce(json_agg(x),'[]') from (select i.payment_method as method, count(*) as n, sum(i.paid_amount) as amount from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1 order by 3 desc) x),
    'by_cashier', (select coalesce(json_agg(x),'[]') from (select s.cashier_name as cashier, count(*) as n, sum(i.paid_amount) as amount from invoices i join shifts s on s.id=i.shift_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by 1 order by 3 desc) x),
    'items', (select coalesce(json_agg(x),'[]') from (select ii.name, sum(ii.qty) as qty, sum(ii.qty*ii.price) as revenue, sum(ii.qty*(ii.price-ii.cost)) as profit from invoice_items ii join invoices i on i.id=ii.invoice_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) group by ii.name order by 3 desc limit 300) x),
    'sales', (select coalesce(json_agg(x),'[]') from (select i.id, i.paid_at, s.cashier_name as cashier, i.payment_method as method, i.total, i.discount, i.paid_amount, c.name as customer from invoices i left join shifts s on s.id=i.shift_id left join customers c on c.id=i.customer_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) and (p_branch is null or i.branch_id=p_branch) order by i.paid_at desc limit 5000) x),
    'purchases', (select coalesce(json_agg(x),'[]') from (select p.id, p.created_at, p.kind, sp.name as supplier, p.total, p.paid, p.note from purchases p join suppliers sp on sp.id=p.supplier_id where p.created_at>=f and p.created_at<e order by p.id desc limit 2000) x),
    'vouchers', (select coalesce(json_agg(x),'[]') from (select v.id, v.created_at, v.kind, a.name as account, v.amount, v.party_type, v.note from vouchers v join accounts a on a.id=v.account_id where v.created_at>=f and v.created_at<e and (p_shift is null or v.shift_id=p_shift) order by v.id desc limit 2000) x),
    'stock', (select coalesce(json_agg(x),'[]') from (select m.category, m.name, m.stock, m.cost, m.price, m.stock*m.cost as value from menu_items m order by m.category, m.id) x),
    'treasury', (select coalesce(json_agg(x),'[]') from (select a.name, a.kind, coalesce(sum(t.amount),0) as balance from accounts a left join treasury_tx t on t.account_id=a.id group by a.id order by a.id) x),
    'shifts', (select coalesce(json_agg(x),'[]') from (select s.id, s.cashier_name, s.opened_at, s.closed_at, s.opening_cash, s.counted_cash, s.expected_cash, (s.counted_cash - s.expected_cash) as diff from shifts s where s.opened_at>=f and s.opened_at<e order by s.id desc) x),
    'balances', json_build_object('customers',(select coalesce(sum(balance),0) from customers),'suppliers',(select coalesce(sum(balance),0) from suppliers))
  ) into res; return res; end $$;

revoke all on function admin_save_branch(int,text,text,double precision,double precision,text,boolean), admin_save_area(int,text,text,boolean,int,int,int,boolean), admin_set_radius(numeric), place_order(jsonb,int,text,text,text), cancel_my_order(uuid),
  set_order_status(uuid,text,text,text), branch_stock(), adjust_branch_stock(int,int,int,text), transfer_stock(int,int,int,int,text), lock_period(date), post_manual_entry(date,text,jsonb), list_journal(int), post_points_row(points_ledger),
  record_offline_sale(uuid,jsonb,text,timestamptz), dash_kpis(timestamptz,timestamptz,int,int), dashboard_data(date,date,int,int), report_data(date,date,int,int) from public;
grant execute on function admin_save_branch(int,text,text,double precision,double precision,text,boolean), admin_save_area(int,text,text,boolean,int,int,int,boolean), admin_set_radius(numeric), place_order(jsonb,int,text,text,text), cancel_my_order(uuid),
  set_order_status(uuid,text,text,text), branch_stock(), adjust_branch_stock(int,int,int,text), transfer_stock(int,int,int,int,text), lock_period(date), post_manual_entry(date,text,jsonb), list_journal(int),
  record_offline_sale(uuid,jsonb,text,timestamptz), dashboard_data(date,date,int,int), report_data(date,date,int,int) to authenticated;

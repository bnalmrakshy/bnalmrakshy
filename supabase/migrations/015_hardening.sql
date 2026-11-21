-- إصلاح مشكلة فتح الشيفت + تقوية النظام. شغّله بعد 014، وأمن يتشغّل أكتر من مرة.
-- ١) السبب الأرجح لمشكلة الشيفت: سياسات الجداول بتنادي is_staff()/is_admin() ومكانش ليها صلاحية تنفيذ، فكل قراءة للشيفتات والعملاء والحسابات كانت بتفشل.
grant execute on function is_staff(), is_admin(), acct_for(text) to authenticated;

alter table menu_items add column if not exists min_stock int not null default 0;
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('open','paid','void','refunded'));

-- ٢) فتح الشيفت: لو عندك شيفت مفتوح بيرجّعه بدل ما يدّي خطأ
create or replace function open_shift(opening numeric) returns int language plpgsql security definer set search_path=public as $$
declare sid int; nm text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if opening < 0 then raise exception 'bad amount'; end if;
  select id into sid from shifts where cashier_id=auth.uid() and closed_at is null;
  if sid is not null then return sid; end if;
  select display_name into nm from profiles where id=auth.uid();
  insert into shifts(cashier_id,cashier_name,opening_cash) values (auth.uid(),nm,opening) returning id into sid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'open_shift',jsonb_build_object('shift',sid,'opening',opening));
  return sid; end $$;

-- ٣) قفل الشيفت: بيلغي الفواتير المفتوحة اللي محدش مسحها، وبيرفض لو فيه فاتورة العميل مسحها وماتدفعتش، وبيرجّع ملخص
create or replace function close_shift(counted numeric, nt text default null) returns json language plpgsql security definer set search_path=public as $$
declare s shifts; exp numeric;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select * into s from shifts where cashier_id=auth.uid() and closed_at is null for update;
  if s.id is null then raise exception 'no open shift'; end if;
  if exists (select 1 from invoices where created_by=auth.uid() and status='open' and claimed_by is not null) then raise exception 'claimed invoice pending'; end if;
  update invoices set status='void' where created_by=auth.uid() and status='open' and claimed_by is null;
  select s.opening_cash + coalesce(sum(t.amount),0) into exp from treasury_tx t join accounts a on a.id=t.account_id where t.shift_id=s.id and a.kind='cash';
  update shifts set closed_at=now(), counted_cash=counted, expected_cash=exp, note=nt where id=s.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'close_shift',jsonb_build_object('shift',s.id,'expected',exp,'counted',counted));
  return json_build_object('expected',exp,'counted',counted,'diff',counted-exp,'count',(select count(*) from invoices where shift_id=s.id and status='paid'),
    'by_method',(select coalesce(json_agg(x),'[]') from (select payment_method as method, count(*) as n, sum(paid_amount) as amount from invoices where shift_id=s.id and status='paid' group by 1) x)); end $$;

create or replace function admin_close_shift(p_id int, counted numeric, nt text default null) returns void language plpgsql security definer set search_path=public as $$
declare s shifts; exp numeric;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into s from shifts where id=p_id and closed_at is null for update;
  if s.id is null then raise exception 'no open shift'; end if;
  update invoices set status='void' where created_by=s.cashier_id and status='open' and claimed_by is null;
  select s.opening_cash + coalesce(sum(t.amount),0) into exp from treasury_tx t join accounts a on a.id=t.account_id where t.shift_id=s.id and a.kind='cash';
  update shifts set closed_at=now(), counted_cash=counted, expected_cash=exp, note=coalesce(nt,'قفل من الأدمن') where id=s.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'admin_close_shift',jsonb_build_object('shift',s.id,'expected',exp,'counted',counted)); end $$;

-- ٤) الدفع لازم يكون في شيفت مفتوح، والفلوس بتتسجل على الشيفت اللي اتدفع فيه
create or replace function pay_invoice(inv_id uuid, method text, cust int default null) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; paid int; r record; sh int;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if method not in ('cash','card','instapay','credit') then raise exception 'bad method'; end if;
  select id into sh from shifts where cashier_id=auth.uid() and closed_at is null;
  if sh is null then raise exception 'no open shift'; end if;
  select * into inv from invoices where id=inv_id for update;
  if inv.id is null or inv.status <> 'open' then raise exception 'invoice not open'; end if;
  if inv.created_by is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  paid := inv.total - inv.discount;
  if method='credit' then
    if cust is null or not exists (select 1 from customers where id=cust) then raise exception 'customer required'; end if;
    update customers set balance = balance + paid where id=cust;
  else
    insert into treasury_tx(account_id,amount,kind,ref,shift_id,created_by) values (acct_for(method),paid,'sale',inv.id::text,sh,auth.uid());
  end if;
  for r in select item_id, qty from invoice_items where invoice_id=inv.id loop
    if r.item_id is not null then
      update menu_items set stock = stock - r.qty where id=r.item_id;
      insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (r.item_id,-r.qty,'sale',inv.id::text,auth.uid());
    end if;
  end loop;
  update invoices set status='paid', payment_method=method, customer_id=cust, paid_at=now(), paid_amount=paid, shift_id=sh where id=inv.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'pay_invoice',jsonb_build_object('invoice',inv.id,'method',method,'paid',paid));
  return json_build_object('paid',paid); end $$;

-- ٥) استرجاع فاتورة مدفوعة بالكامل (غلطة كاشير أو مرتجع): بيرجّع المخزون والفلوس والنقاط
create or replace function refund_invoice(p_inv uuid, p_reason text default null) returns void language plpgsql security definer set search_path=public as $$
declare inv invoices; r record; rate int; sh int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into inv from invoices where id=p_inv for update;
  if inv.id is null or inv.status <> 'paid' then raise exception 'invoice not paid'; end if;
  select points_per_egp into rate from app_settings where id=1;
  select id into sh from shifts where cashier_id=auth.uid() and closed_at is null;
  for r in select item_id, qty from invoice_items where invoice_id=inv.id loop
    if r.item_id is not null then
      update menu_items set stock = stock + r.qty where id=r.item_id;
      insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (r.item_id,r.qty,'sale_return',inv.id::text,auth.uid());
    end if;
  end loop;
  if inv.payment_method='credit' then update customers set balance = balance - inv.paid_amount where id=inv.customer_id;
  else insert into treasury_tx(account_id,amount,kind,ref,note,shift_id,created_by) values (acct_for(inv.payment_method), -inv.paid_amount, 'refund', inv.id::text, p_reason, sh, auth.uid()); end if;
  if inv.claimed_by is not null then
    if coalesce(inv.points_earned,0) > 0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (inv.claimed_by,-inv.points_earned,'invoice_refund',inv.id); end if;
    if inv.discount > 0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (inv.claimed_by,inv.discount*rate,'redeem_refund',inv.id); end if;
  end if;
  update invoices set status='refunded' where id=inv.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'refund_invoice',jsonb_build_object('invoice',inv.id,'amount',inv.paid_amount,'reason',p_reason)); end $$;

create or replace function get_league(period text, lim int default 10)
returns table(rk int, display_name text, points bigint, visits bigint, is_me boolean, avatar_url text)
language sql stable security definer set search_path=public as $$
  with t as (
    select p.id, p.display_name, p.avatar_url, sum(l.delta)::bigint pts, (count(*) filter (where l.reason='invoice'))::bigint vis
    from points_ledger l join profiles p on p.id=l.member_id
    where l.reason in ('invoice','invoice_refund') and not p.suspended and p.role='member' and case period
      when 'week' then l.created_at >= date_trunc('week', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
      when 'month' then l.created_at >= date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
      else true end
    group by p.id having sum(l.delta) > 0),
  r as (select t.*, rank() over (order by pts desc, vis desc)::int rnk from t)
  select rnk, display_name, pts, vis, (id = auth.uid()), avatar_url from r where rnk <= least(lim,100) or id = auth.uid() order by rnk, display_name $$;

create or replace function pos_items() returns table(id int, category text, name text, price int, points int, stock int, low boolean)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_staff() then raise exception 'forbidden'; end if;
  return query select m.id,m.category,m.name,m.price,m.points,m.stock,(m.min_stock > 0 and m.stock <= m.min_stock) from menu_items m where m.active order by m.id; end $$;

drop function if exists admin_items();
create function admin_items() returns table(id int, category text, name text, price int, points int, cost numeric, stock int, active boolean, min_stock int)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if;
  return query select m.id,m.category,m.name,m.price,m.points,m.cost,m.stock,m.active,m.min_stock from menu_items m order by m.id; end $$;
drop function if exists admin_save_item(int,int,int,numeric,boolean);
create or replace function admin_save_item(iid int, newprice int, newpoints int, newcost numeric, isactive boolean, newmin int default 0) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if newprice < 1 or newprice > 100000 or newpoints < 0 or newpoints > 1000000 or newcost < 0 or newmin < 0 then raise exception 'bad values'; end if;
  update menu_items set price=newprice, points=newpoints, cost=newcost, active=isactive, min_stock=newmin where id=iid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'update_item',jsonb_build_object('item',iid,'price',newprice,'points',newpoints,'cost',newcost)); end $$;

create or replace function admin_alerts() returns json language plpgsql stable security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'low_stock', (select coalesce(json_agg(x),'[]') from (select name, stock, min_stock from menu_items where active and ((min_stock > 0 and stock <= min_stock) or stock < 0) order by stock limit 20) x),
    'open_shifts', (select coalesce(json_agg(x),'[]') from (select id, cashier_name, opened_at from shifts where closed_at is null order by id) x),
    'cash_diffs', (select coalesce(json_agg(x),'[]') from (select id, cashier_name, closed_at, counted_cash - expected_cash as diff from shifts where closed_at > now() - interval '7 days' and counted_cash is not null and counted_cash <> expected_cash order by id desc limit 10) x),
    'debtors', (select coalesce(json_agg(x),'[]') from (select name, balance from customers where balance > 0 order by balance desc limit 5) x),
    'stale', (select count(*) from invoices where status='open' and created_at < now() - interval '1 day')); end $$;

-- نسخة احتياطية كاملة (JSON) بتتحمّل من المكتب
create or replace function backup_data() returns json language plpgsql stable security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return json_build_object('exported_at', now(),
    'menu_items', (select coalesce(json_agg(t),'[]') from menu_items t), 'customers', (select coalesce(json_agg(t),'[]') from customers t), 'suppliers', (select coalesce(json_agg(t),'[]') from suppliers t),
    'accounts', (select coalesce(json_agg(t),'[]') from accounts t), 'treasury_tx', (select coalesce(json_agg(t),'[]') from treasury_tx t), 'vouchers', (select coalesce(json_agg(t),'[]') from vouchers t),
    'purchases', (select coalesce(json_agg(t),'[]') from purchases t), 'purchase_items', (select coalesce(json_agg(t),'[]') from purchase_items t), 'shifts', (select coalesce(json_agg(t),'[]') from shifts t),
    'stock_moves', (select coalesce(json_agg(t),'[]') from stock_moves t), 'invoice_items', (select coalesce(json_agg(t),'[]') from invoice_items t),
    'invoices', (select coalesce(json_agg(t),'[]') from (select id,status,total,discount,points,points_earned,paid_amount,payment_method,created_by,claimed_by,shift_id,customer_id,created_at,paid_at,claimed_at from invoices) t),
    'points_ledger', (select coalesce(json_agg(t),'[]') from points_ledger t),
    'profiles', (select coalesce(json_agg(t),'[]') from (select id,username,display_name,role,suspended,streak,last_visit,created_at from profiles) t)); end $$;

revoke all on function admin_close_shift(int,numeric,text), refund_invoice(uuid,text), pos_items(), admin_items(), admin_save_item(int,int,int,numeric,boolean,int), admin_alerts(), backup_data(), open_shift(numeric), close_shift(numeric,text), pay_invoice(uuid,text,int) from public;
grant execute on function admin_close_shift(int,numeric,text), refund_invoice(uuid,text), pos_items(), admin_items(), admin_save_item(int,int,int,numeric,boolean,int), admin_alerts(), backup_data(), open_shift(numeric), close_shift(numeric,text), pay_invoice(uuid,text,int) to authenticated;

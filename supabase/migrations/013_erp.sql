-- المنصة الكاملة: كاشير وشيفتات ودفع (كاش/فيزا/إنستاباي/آجل) ومخزون ومشتريات وموردين وعملاء وخزن وسندات وجرد وتقارير. شغّله بعد 012.
alter table menu_items add column if not exists stock int not null default 0, add column if not exists cost numeric(12,2) not null default 0;
-- التكلفة والمخزون سرّيين: مش بيتقروا من الـ API العام، بس من دوال الأدمن
revoke select on menu_items from anon, authenticated;
grant select (id,category,name,price,points,active) on menu_items to anon, authenticated;

create table if not exists accounts (id serial primary key, name text not null unique, kind text not null check (kind in ('cash','bank','wallet')), created_at timestamptz default now());
insert into accounts(name,kind) values ('الخزنة','cash'),('البنك (فيزا)','bank'),('إنستاباي','wallet') on conflict (name) do nothing;
create table if not exists shifts (id serial primary key, cashier_id uuid references profiles on delete set null, cashier_name text not null, opened_at timestamptz not null default now(), closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0, counted_cash numeric(12,2), expected_cash numeric(12,2), note text);
create unique index if not exists one_open_shift on shifts(cashier_id) where closed_at is null;
create table if not exists customers (id serial primary key, name text not null, phone text, balance numeric(12,2) not null default 0, created_at timestamptz default now());
create table if not exists suppliers (id serial primary key, name text not null, phone text, balance numeric(12,2) not null default 0, created_at timestamptz default now());
alter table invoices add column if not exists status text not null default 'open' check (status in ('open','paid','void')), add column if not exists shift_id int references shifts,
  add column if not exists payment_method text check (payment_method in ('cash','card','instapay','credit')), add column if not exists paid_at timestamptz,
  add column if not exists customer_id int references customers, add column if not exists paid_amount int;
alter table invoice_items add column if not exists cost numeric(12,2) not null default 0;
update invoices set status='paid', paid_at=claimed_at, payment_method='cash', paid_amount=total-discount where claimed_by is not null and status='open' and paid_at is null;
create table if not exists treasury_tx (id bigserial primary key, account_id int not null references accounts, amount numeric(12,2) not null, kind text not null, ref text, note text, shift_id int references shifts, created_by uuid references profiles on delete set null, created_at timestamptz not null default now());
create table if not exists vouchers (id bigserial primary key, kind text not null check (kind in ('in','out')), account_id int not null references accounts, amount numeric(12,2) not null check (amount>0),
  party_type text not null check (party_type in ('customer','supplier','other')), party_id int, note text, shift_id int references shifts, created_by uuid references profiles on delete set null, created_at timestamptz not null default now());
create table if not exists purchases (id bigserial primary key, kind text not null check (kind in ('purchase','return')), supplier_id int not null references suppliers, total numeric(12,2) not null, paid numeric(12,2) not null default 0,
  account_id int references accounts, note text, created_by uuid references profiles on delete set null, created_at timestamptz not null default now());
create table if not exists purchase_items (id bigserial primary key, purchase_id bigint not null references purchases on delete cascade, item_id int references menu_items on delete set null, name text not null, qty int not null check (qty>0), unit_cost numeric(12,2) not null);
create table if not exists stock_moves (id bigserial primary key, item_id int references menu_items on delete cascade, qty_delta int not null, reason text not null, ref text, created_by uuid references profiles on delete set null, created_at timestamptz not null default now());

create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(my_role() in ('staff','admin'),false) $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(my_role()='admin',false) $$;
create or replace function acct_for(m text) returns int language sql stable security definer set search_path=public as $$
  select id from accounts where kind = case m when 'cash' then 'cash' when 'card' then 'bank' else 'wallet' end order by id limit 1 $$;

do $$ declare t text; begin foreach t in array array['accounts','shifts','customers','suppliers','treasury_tx','vouchers','purchases','purchase_items','stock_moves'] loop
  execute format('alter table %I enable row level security', t); execute format('grant select on %I to authenticated', t); end loop; end $$;
drop policy if exists p_acc on accounts; create policy p_acc on accounts for select using (is_admin());
drop policy if exists p_sup on suppliers; create policy p_sup on suppliers for select using (is_admin());
drop policy if exists p_tx on treasury_tx; create policy p_tx on treasury_tx for select using (is_admin());
drop policy if exists p_vou on vouchers; create policy p_vou on vouchers for select using (is_admin());
drop policy if exists p_pur on purchases; create policy p_pur on purchases for select using (is_admin());
drop policy if exists p_puri on purchase_items; create policy p_puri on purchase_items for select using (is_admin());
drop policy if exists p_stk on stock_moves; create policy p_stk on stock_moves for select using (is_admin());
drop policy if exists p_cus on customers; create policy p_cus on customers for select using (is_staff());
drop policy if exists p_shf on shifts; create policy p_shf on shifts for select using (cashier_id=auth.uid() or is_admin());
drop policy if exists i_staff on invoices; create policy i_staff on invoices for select using (created_by=auth.uid());

create or replace function open_shift(opening numeric) returns int language plpgsql security definer set search_path=public as $$
declare sid int; nm text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if opening < 0 then raise exception 'bad amount'; end if;
  select display_name into nm from profiles where id=auth.uid();
  insert into shifts(cashier_id,cashier_name,opening_cash) values (auth.uid(),nm,opening) returning id into sid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'open_shift',jsonb_build_object('shift',sid,'opening',opening));
  return sid; end $$;
create or replace function close_shift(counted numeric, nt text default null) returns json language plpgsql security definer set search_path=public as $$
declare s shifts; exp numeric;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select * into s from shifts where cashier_id=auth.uid() and closed_at is null for update;
  if s.id is null then raise exception 'no open shift'; end if;
  select s.opening_cash + coalesce(sum(t.amount),0) into exp from treasury_tx t join accounts a on a.id=t.account_id where t.shift_id=s.id and a.kind='cash';
  update shifts set closed_at=now(), counted_cash=counted, expected_cash=exp, note=nt where id=s.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'close_shift',jsonb_build_object('shift',s.id,'expected',exp,'counted',counted));
  return json_build_object('expected',exp,'counted',counted,'diff',counted-exp); end $$;

create or replace function create_invoice(lines jsonb, mins int default 2) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; sh int; tot int:=0; pts int:=0; l jsonb; m menu_items; q int;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select id into sh from shifts where cashier_id=auth.uid() and closed_at is null;
  if sh is null then raise exception 'no open shift'; end if;
  if mins not between 1 and 30 then raise exception 'bad duration'; end if;
  if jsonb_typeof(lines)<>'array' or jsonb_array_length(lines) not between 1 and 30 then raise exception 'bad lines'; end if;
  insert into invoices(token,created_by,shift_id,expires_at) values (replace(gen_random_uuid()::text,'-',''),auth.uid(),sh,now()+make_interval(mins=>mins)) returning * into inv;
  for l in select * from jsonb_array_elements(lines) loop
    q := (l->>'qty')::int; select * into m from menu_items where id=(l->>'id')::int and active;
    if m.id is null or q not between 1 and 100 then raise exception 'bad item'; end if;
    insert into invoice_items(invoice_id,item_id,name,qty,price,points,cost) values (inv.id,m.id,m.name,q,m.price,m.points,m.cost);
    tot := tot + m.price*q; pts := pts + m.points*q;
  end loop;
  update invoices set total=tot, points=pts where id=inv.id;
  return json_build_object('id',inv.id,'token',inv.token,'total',tot,'points',pts,'expires_at',inv.expires_at); end $$;

create or replace function pay_invoice(inv_id uuid, method text, cust int default null) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; paid int; r record;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if method not in ('cash','card','instapay','credit') then raise exception 'bad method'; end if;
  select * into inv from invoices where id=inv_id for update;
  if inv.id is null or inv.status <> 'open' then raise exception 'invoice not open'; end if;
  if inv.created_by is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  paid := inv.total - inv.discount;
  if method='credit' then
    if cust is null or not exists (select 1 from customers where id=cust) then raise exception 'customer required'; end if;
    update customers set balance = balance + paid where id=cust;
  else
    insert into treasury_tx(account_id,amount,kind,ref,shift_id,created_by) values (acct_for(method),paid,'sale',inv.id::text,inv.shift_id,auth.uid());
  end if;
  for r in select item_id, qty from invoice_items where invoice_id=inv.id loop
    if r.item_id is not null then
      update menu_items set stock = stock - r.qty where id=r.item_id;
      insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (r.item_id,-r.qty,'sale',inv.id::text,auth.uid());
    end if;
  end loop;
  update invoices set status='paid', payment_method=method, customer_id=cust, paid_at=now(), paid_amount=paid where id=inv.id;
  return json_build_object('paid',paid); end $$;

create or replace function cancel_invoice(inv_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare inv invoices;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select * into inv from invoices where id=inv_id for update;
  if inv.id is null or inv.status <> 'open' or inv.claimed_by is not null then raise exception 'invoice not open'; end if;
  if inv.created_by is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  update invoices set status='void' where id=inv_id; end $$;

create or replace function preview_invoice(tok text) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; bal int; rate int;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok;
  if inv.id is null or inv.status='void' or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select points_per_egp into rate from app_settings where id=1;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=auth.uid();
  return json_build_object('status',inv.status,'total',inv.total,'points',inv.points,'balance',bal,'rate',rate,
    'lines',(select json_agg(json_build_object('name',name,'qty',qty,'price',price)) from invoice_items where invoice_id=inv.id)); end $$;

create or replace function claim_invoice(tok text, use_points boolean default false) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; p profiles; s app_settings; bal int; disc int:=0; paid int; earn int; ns int;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok for update;
  if inv.id is null or inv.status='void' or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select * into s from app_settings where id=1;
  select * into p from profiles where id=auth.uid() for update;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=p.id;
  if use_points and inv.status='open' then disc := least(bal / s.points_per_egp, inv.total); end if;  -- الخصم بس قبل الدفع
  paid := inv.total - disc;
  earn := case when inv.total=0 then 0 else floor(inv.points::numeric*paid/inv.total)::int end;
  update invoices set claimed_by=p.id, claimed_at=now(), discount=disc, points_earned=earn where id=inv.id;
  if disc>0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (p.id,-disc*s.points_per_egp,'redeem',inv.id); end if;
  if earn>0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (p.id,earn,'invoice',inv.id); end if;
  ns := p.streak;
  if p.last_visit is distinct from today then
    ns := case when p.last_visit = today-1 then p.streak+1 else 1 end;
    insert into checkins(member_id,day) values (p.id,today);
    update profiles set streak=ns, last_visit=today where id=p.id;
  end if;
  return json_build_object('total',inv.total,'discount',disc,'paid',paid,'earned',earn,'streak',ns,'target',s.streak_target,'drink',false); end $$;

create or replace function add_customer(p_name text, p_phone text default null) returns int language plpgsql security definer set search_path=public as $$
declare cid int;
begin if not is_staff() then raise exception 'forbidden'; end if; if trim(coalesce(p_name,''))='' then raise exception 'bad name'; end if;
  insert into customers(name,phone) values (trim(p_name), nullif(trim(coalesce(p_phone,'')),'')) returning id into cid; return cid; end $$;
create or replace function add_supplier(p_name text, p_phone text default null) returns int language plpgsql security definer set search_path=public as $$
declare sid int;
begin if not is_admin() then raise exception 'forbidden'; end if; if trim(coalesce(p_name,''))='' then raise exception 'bad name'; end if;
  insert into suppliers(name,phone) values (trim(p_name), nullif(trim(coalesce(p_phone,'')),'')) returning id into sid; return sid; end $$;
create or replace function account_add(p_name text, p_kind text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'forbidden'; end if; insert into accounts(name,kind) values (trim(p_name),p_kind); end $$;

create or replace function admin_items() returns table(id int, category text, name text, price int, points int, cost numeric, stock int, active boolean)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if;
  return query select m.id,m.category,m.name,m.price,m.points,m.cost,m.stock,m.active from menu_items m order by m.id; end $$;
create or replace function admin_save_item(iid int, newprice int, newpoints int, newcost numeric, isactive boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if newprice < 1 or newprice > 100000 or newpoints < 0 or newpoints > 1000000 or newcost < 0 then raise exception 'bad values'; end if;
  update menu_items set price=newprice, points=newpoints, cost=newcost, active=isactive where id=iid;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'update_item',jsonb_build_object('item',iid,'price',newprice,'points',newpoints,'cost',newcost)); end $$;
create or replace function adjust_stock(p_item int, p_qty int, p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare cur int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select stock into cur from menu_items where id=p_item; if cur is null then raise exception 'not found'; end if;
  update menu_items set stock=p_qty where id=p_item;
  insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (p_item,p_qty-cur,'count',p_note,auth.uid()); end $$;

create or replace function create_purchase(p_kind text, p_supplier int, p_lines jsonb, p_paid numeric default 0, p_acct int default null, p_note text default null) returns bigint
language plpgsql security definer set search_path=public as $$
declare pid bigint; tot numeric:=0; l jsonb; m menu_items; q int; c numeric; sgn int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_kind not in ('purchase','return') then raise exception 'bad kind'; end if;
  if not exists (select 1 from suppliers where id=p_supplier) then raise exception 'supplier required'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'bad lines'; end if;
  if p_paid < 0 or (p_paid > 0 and p_acct is null) then raise exception 'bad payment'; end if;
  sgn := case when p_kind='purchase' then 1 else -1 end;
  insert into purchases(kind,supplier_id,total,paid,account_id,note,created_by) values (p_kind,p_supplier,0,p_paid,p_acct,p_note,auth.uid()) returning id into pid;
  for l in select * from jsonb_array_elements(p_lines) loop
    q := (l->>'qty')::int; c := (l->>'cost')::numeric; select * into m from menu_items where id=(l->>'id')::int;
    if m.id is null or q < 1 or c < 0 then raise exception 'bad item'; end if;
    insert into purchase_items(purchase_id,item_id,name,qty,unit_cost) values (pid,m.id,m.name,q,c);
    update menu_items set stock = stock + sgn*q, cost = case when p_kind='purchase' then c else cost end where id=m.id;
    insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (m.id,sgn*q,p_kind,pid::text,auth.uid());
    tot := tot + q*c;
  end loop;
  update purchases set total=tot where id=pid;
  update suppliers set balance = balance + sgn*(tot - p_paid) where id=p_supplier;
  if p_paid > 0 then insert into treasury_tx(account_id,amount,kind,ref,shift_id,created_by) values (p_acct, -sgn*p_paid, p_kind, pid::text, (select id from shifts where cashier_id=auth.uid() and closed_at is null), auth.uid()); end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'create_'||p_kind,jsonb_build_object('id',pid,'total',tot));
  return pid; end $$;

create or replace function create_voucher(p_kind text, p_acct int, p_amount numeric, p_ptype text, p_pid int default null, p_note text default null) returns bigint
language plpgsql security definer set search_path=public as $$
declare vid bigint; sh int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_kind not in ('in','out') or p_amount <= 0 or p_ptype not in ('customer','supplier','other') then raise exception 'bad values'; end if;
  if not exists (select 1 from accounts where id=p_acct) then raise exception 'bad account'; end if;
  if p_ptype='customer' and not exists (select 1 from customers where id=p_pid) then raise exception 'party required'; end if;
  if p_ptype='supplier' and not exists (select 1 from suppliers where id=p_pid) then raise exception 'party required'; end if;
  select id into sh from shifts where cashier_id=auth.uid() and closed_at is null;
  insert into vouchers(kind,account_id,amount,party_type,party_id,note,shift_id,created_by) values (p_kind,p_acct,p_amount,p_ptype,p_pid,p_note,sh,auth.uid()) returning id into vid;
  insert into treasury_tx(account_id,amount,kind,ref,note,shift_id,created_by) values (p_acct, case when p_kind='in' then p_amount else -p_amount end, 'voucher_'||p_kind, vid::text, p_note, sh, auth.uid());
  if p_ptype='customer' then update customers set balance = balance + case when p_kind='in' then -p_amount else p_amount end where id=p_pid; end if;
  if p_ptype='supplier' then update suppliers set balance = balance + case when p_kind='out' then -p_amount else p_amount end where id=p_pid; end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'voucher_'||p_kind,jsonb_build_object('id',vid,'amount',p_amount));
  return vid; end $$;

create or replace function treasury_balances() returns table(id int, name text, kind text, balance numeric) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if;
  return query select a.id, a.name, a.kind, coalesce(sum(t.amount),0) from accounts a left join treasury_tx t on t.account_id=a.id group by a.id order by a.id; end $$;

-- الجرد والتقارير: لفترة (بتوقيت القاهرة) وشيفت اختياري
create or replace function report_data(d_from date, d_to date, p_shift int default null) returns json language plpgsql stable security definer set search_path=public as $$
declare f timestamptz := d_from::timestamp at time zone 'Africa/Cairo'; e timestamptz := (d_to+1)::timestamp at time zone 'Africa/Cairo'; res json;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select json_build_object(
    'summary', (select json_build_object('sales',coalesce(sum(i.paid_amount),0),'count',count(*),'gross',coalesce(sum(i.total),0),'discount',coalesce(sum(i.discount),0),
       'cost',coalesce((select sum(ii.cost*ii.qty) from invoice_items ii join invoices i2 on i2.id=ii.invoice_id where i2.status='paid' and i2.paid_at>=f and i2.paid_at<e and (p_shift is null or i2.shift_id=p_shift)),0))
       from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift)),
    'by_method', (select coalesce(json_agg(x),'[]') from (select i.payment_method as method, count(*) as n, sum(i.paid_amount) as amount from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1 order by 3 desc) x),
    'by_cashier', (select coalesce(json_agg(x),'[]') from (select s.cashier_name as cashier, count(*) as n, sum(i.paid_amount) as amount from invoices i join shifts s on s.id=i.shift_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1 order by 3 desc) x),
    'items', (select coalesce(json_agg(x),'[]') from (select ii.name, sum(ii.qty) as qty, sum(ii.qty*ii.price) as revenue, sum(ii.qty*(ii.price-ii.cost)) as profit from invoice_items ii join invoices i on i.id=ii.invoice_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by ii.name order by 3 desc limit 300) x),
    'sales', (select coalesce(json_agg(x),'[]') from (select i.id, i.paid_at, s.cashier_name as cashier, i.payment_method as method, i.total, i.discount, i.paid_amount, c.name as customer from invoices i left join shifts s on s.id=i.shift_id left join customers c on c.id=i.customer_id where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) order by i.paid_at desc limit 5000) x),
    'purchases', (select coalesce(json_agg(x),'[]') from (select p.id, p.created_at, p.kind, sp.name as supplier, p.total, p.paid, p.note from purchases p join suppliers sp on sp.id=p.supplier_id where p.created_at>=f and p.created_at<e order by p.id desc limit 2000) x),
    'vouchers', (select coalesce(json_agg(x),'[]') from (select v.id, v.created_at, v.kind, a.name as account, v.amount, v.party_type, v.note from vouchers v join accounts a on a.id=v.account_id where v.created_at>=f and v.created_at<e and (p_shift is null or v.shift_id=p_shift) order by v.id desc limit 2000) x),
    'stock', (select coalesce(json_agg(x),'[]') from (select m.category, m.name, m.stock, m.cost, m.price, m.stock*m.cost as value from menu_items m order by m.category, m.id) x),
    'treasury', (select coalesce(json_agg(x),'[]') from (select a.name, a.kind, coalesce(sum(t.amount),0) as balance from accounts a left join treasury_tx t on t.account_id=a.id group by a.id order by a.id) x),
    'shifts', (select coalesce(json_agg(x),'[]') from (select s.id, s.cashier_name, s.opened_at, s.closed_at, s.opening_cash, s.counted_cash, s.expected_cash, (s.counted_cash - s.expected_cash) as diff from shifts s where s.opened_at>=f and s.opened_at<e order by s.id desc) x),
    'balances', json_build_object('customers',(select coalesce(sum(balance),0) from customers),'suppliers',(select coalesce(sum(balance),0) from suppliers))
  ) into res; return res; end $$;

revoke all on function is_staff(), is_admin(), acct_for(text), open_shift(numeric), close_shift(numeric,text), create_invoice(jsonb,int), pay_invoice(uuid,text,int), cancel_invoice(uuid),
  preview_invoice(text), claim_invoice(text,boolean), add_customer(text,text), add_supplier(text,text), account_add(text,text), admin_items(), admin_save_item(int,int,int,numeric,boolean),
  adjust_stock(int,int,text), create_purchase(text,int,jsonb,numeric,int,text), create_voucher(text,int,numeric,text,int,text), treasury_balances(), report_data(date,date,int) from public;
grant execute on function open_shift(numeric), close_shift(numeric,text), create_invoice(jsonb,int), pay_invoice(uuid,text,int), cancel_invoice(uuid), preview_invoice(text), claim_invoice(text,boolean),
  add_customer(text,text), add_supplier(text,text), account_add(text,text), admin_items(), admin_save_item(int,int,int,numeric,boolean), adjust_stock(int,int,text),
  create_purchase(text,int,jsonb,numeric,int,text), create_voucher(text,int,numeric,text,int,text), treasury_balances(), report_data(date,date,int) to authenticated;

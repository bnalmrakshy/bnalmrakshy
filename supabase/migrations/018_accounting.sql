-- محاسبة القيد المزدوج: شجرة حسابات + قيود يومية بتتسجل تلقائيًا من المبيعات والمشتريات والسندات والمصروفات والجرد. شغّله بعد 017.
create table if not exists gl_accounts (id serial primary key, code text unique not null, name text not null, type text not null check (type in ('asset','liability','equity','revenue','expense')), system boolean not null default false, active boolean not null default true);
insert into gl_accounts(code,name,type,system) values
 ('1100','الخزنة (كاش)','asset',true),('1200','البنك (فيزا)','asset',true),('1300','إنستاباي','asset',true),('1400','عملاء (آجل)','asset',true),('1500','المخزون','asset',true),
 ('2100','الموردين','liability',true),('3100','رأس المال','equity',true),
 ('4100','إيراد المبيعات','revenue',true),('4200','خصومات النقاط على المبيعات','revenue',true),('4900','إيرادات أخرى','revenue',true),
 ('5100','تكلفة البضاعة المباعة','expense',true),('5200','فروق وتالف المخزون','expense',true),
 ('6100','إيجار','expense',false),('6200','مرتبات وأجور','expense',false),('6300','كهرباء ومياه وإنترنت','expense',false),('6400','تسويق وإعلان','expense',false),('6500','صيانة','expense',false),('6900','مصروفات أخرى','expense',true)
on conflict (code) do nothing;
create table if not exists journal_entries (id bigserial primary key, entry_date date not null default ((now() at time zone 'Africa/Cairo')::date), memo text, source text not null, source_id text,
  branch_id int references branches, created_by uuid references profiles on delete set null, created_at timestamptz not null default now());
create table if not exists journal_lines (id bigserial primary key, entry_id bigint not null references journal_entries on delete cascade, account_id int not null references gl_accounts,
  debit numeric(14,2) not null default 0, credit numeric(14,2) not null default 0, check (debit >= 0 and credit >= 0 and (debit = 0 or credit = 0)));
create index if not exists jl_acc on journal_lines(account_id); create index if not exists je_date on journal_entries(entry_date); create unique index if not exists je_src on journal_entries(source, source_id) where source in ('sale','purchase','voucher','refund','count');
alter table gl_accounts enable row level security; alter table journal_entries enable row level security; alter table journal_lines enable row level security;
drop policy if exists g1 on gl_accounts; create policy g1 on gl_accounts for select using (is_admin());
drop policy if exists g2 on journal_entries; create policy g2 on journal_entries for select using (is_admin());
drop policy if exists g3 on journal_lines; create policy g3 on journal_lines for select using (is_admin());
grant select on gl_accounts, journal_entries, journal_lines to authenticated;

create or replace function gl(c text) returns int language sql stable as $$ select id from gl_accounts where code=c $$;
create or replace function pay_code(k text) returns text language sql immutable as $$ select case k when 'cash' then '1100' when 'bank' then '1200' when 'wallet' then '1300' when 'card' then '1200' when 'instapay' then '1300' else '1400' end $$;
create or replace function post_entry(p_source text, p_source_id text, p_memo text, p_branch int, p_lines jsonb, p_date date default null) returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint; l jsonb; d numeric:=0; c numeric:=0;
begin
  for l in select * from jsonb_array_elements(p_lines) loop d := d + coalesce((l->>'debit')::numeric,0); c := c + coalesce((l->>'credit')::numeric,0); end loop;
  if round(d,2) <> round(c,2) then raise exception 'unbalanced entry'; end if;
  if d = 0 then return null; end if;
  insert into journal_entries(entry_date,memo,source,source_id,branch_id,created_by) values (coalesce(p_date,(now() at time zone 'Africa/Cairo')::date),p_memo,p_source,p_source_id,p_branch,auth.uid()) returning id into eid;
  insert into journal_lines(entry_id,account_id,debit,credit) select eid, gl(x->>'code'), coalesce((x->>'debit')::numeric,0), coalesce((x->>'credit')::numeric,0)
    from jsonb_array_elements(p_lines) x where coalesce((x->>'debit')::numeric,0) + coalesce((x->>'credit')::numeric,0) > 0;
  return eid; end $$;

create or replace function post_sale_entry(i invoices, rev boolean) returns void language plpgsql security definer set search_path=public as $$
declare v_cost numeric; pay text; dr text := case when rev then 'credit' else 'debit' end; cr text := case when rev then 'debit' else 'credit' end;
begin
  select coalesce(sum(ii.cost*ii.qty),0) into v_cost from invoice_items ii where ii.invoice_id=i.id;
  pay := pay_code(coalesce(i.payment_method,'credit'));
  perform post_entry(case when rev then 'refund' else 'sale' end, i.id::text, case when rev then 'استرجاع فاتورة' else 'فاتورة مبيعات' end, i.branch_id, jsonb_build_array(
    jsonb_build_object('code',pay,dr,i.paid_amount), jsonb_build_object('code','4200',dr,i.discount), jsonb_build_object('code','4100',cr,i.total),
    jsonb_build_object('code','5100',dr,v_cost), jsonb_build_object('code','1500',cr,v_cost)), case when rev then null else (i.paid_at at time zone 'Africa/Cairo')::date end); end $$;
create or replace function trg_sale() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='paid' and old.status='open' then perform post_sale_entry(new,false);
  elsif new.status='refunded' and old.status='paid' then perform post_sale_entry(new,true); end if; return new; end $$;
drop trigger if exists post_sale on invoices; create trigger post_sale after update of status on invoices for each row execute function trg_sale();

create or replace function trg_purchase() returns trigger language plpgsql security definer set search_path=public as $$
declare pay text; rest numeric;
begin
  if old.total = 0 and new.total > 0 then
    select pay_code(a.kind) into pay from accounts a where a.id=new.account_id; pay := coalesce(pay,'1100'); rest := new.total - new.paid;
    if new.kind='purchase' then perform post_entry('purchase', new.id::text, 'فاتورة مشتريات', null, jsonb_build_array(jsonb_build_object('code','1500','debit',new.total), jsonb_build_object('code',pay,'credit',new.paid), jsonb_build_object('code','2100','credit',rest)));
    else perform post_entry('purchase', new.id::text||'r', 'مرتجع مشتريات', null, jsonb_build_array(jsonb_build_object('code',pay,'debit',new.paid), jsonb_build_object('code','2100','debit',rest), jsonb_build_object('code','1500','credit',new.total))); end if;
  end if; return new; end $$;
drop trigger if exists post_purchase on purchases; create trigger post_purchase after update of total on purchases for each row execute function trg_purchase();

create or replace function trg_voucher() returns trigger language plpgsql security definer set search_path=public as $$
declare pay text; other text;
begin
  select pay_code(a.kind) into pay from accounts a where a.id=new.account_id;
  if new.kind='in' then other := case new.party_type when 'customer' then '1400' when 'supplier' then '2100' else '4900' end;
    perform post_entry('voucher', new.id::text, 'سند قبض', null, jsonb_build_array(jsonb_build_object('code',pay,'debit',new.amount), jsonb_build_object('code',other,'credit',new.amount)));
  else other := case new.party_type when 'customer' then '1400' when 'supplier' then '2100' else '6900' end;
    perform post_entry('voucher', new.id::text, 'سند صرف', null, jsonb_build_array(jsonb_build_object('code',other,'debit',new.amount), jsonb_build_object('code',pay,'credit',new.amount))); end if;
  return new; end $$;
drop trigger if exists post_voucher on vouchers; create trigger post_voucher after insert on vouchers for each row execute function trg_voucher();

create or replace function trg_count() returns trigger language plpgsql security definer set search_path=public as $$
declare v numeric;
begin
  if new.reason='count' and new.qty_delta <> 0 then select new.qty_delta * cost into v from menu_items where id=new.item_id;
    if v < 0 then perform post_entry('count', new.id::text, 'جرد: عجز مخزون', null, jsonb_build_array(jsonb_build_object('code','5200','debit',-v), jsonb_build_object('code','1500','credit',-v)));
    elsif v > 0 then perform post_entry('count', new.id::text, 'جرد: زيادة مخزون', null, jsonb_build_array(jsonb_build_object('code','1500','debit',v), jsonb_build_object('code','5200','credit',v))); end if; end if; return new; end $$;
drop trigger if exists post_count on stock_moves; create trigger post_count after insert on stock_moves for each row execute function trg_count();

-- متوسط التكلفة المرجّح للمخزون (WAC) بدل آخر سعر شراء
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
    update menu_items set stock = stock + sgn*q,
      cost = case when p_kind='purchase' then (case when greatest(stock,0)+q > 0 then round((greatest(stock,0)*cost + q*c)/(greatest(stock,0)+q), 2) else c end) else cost end where id=m.id;
    insert into stock_moves(item_id,qty_delta,reason,ref,created_by) values (m.id,sgn*q,p_kind,pid::text,auth.uid());
    tot := tot + q*c;
  end loop;
  update purchases set total=tot where id=pid;
  update suppliers set balance = balance + sgn*(tot - p_paid) where id=p_supplier;
  if p_paid > 0 then insert into treasury_tx(account_id,amount,kind,ref,shift_id,created_by) values (p_acct, -sgn*p_paid, p_kind, pid::text, (select id from shifts where cashier_id=auth.uid() and closed_at is null), auth.uid()); end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'create_'||p_kind,jsonb_build_object('id',pid,'total',tot));
  return pid; end $$;

create or replace function create_expense(p_account int, p_code text, p_amount numeric, p_note text default null, p_date date default null, p_branch int default null) returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint; pay text;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_amount <= 0 or not exists (select 1 from gl_accounts where code=p_code and type='expense' and active) then raise exception 'bad values'; end if;
  select pay_code(kind) into pay from accounts where id=p_account; if pay is null then raise exception 'bad account'; end if;
  insert into treasury_tx(account_id,amount,kind,note,created_by) values (p_account,-p_amount,'expense',p_note,auth.uid());
  eid := post_entry('expense', null, coalesce(p_note,'مصروف'), p_branch, jsonb_build_array(jsonb_build_object('code',p_code,'debit',p_amount), jsonb_build_object('code',pay,'credit',p_amount)), p_date);
  insert into audit_logs(actor,action,detail) values (auth.uid(),'create_expense',jsonb_build_object('entry',eid,'code',p_code,'amount',p_amount));
  return eid; end $$;

create or replace function add_opening_balance(p_code text, p_amount numeric, p_date date default null) returns void language plpgsql security definer set search_path=public as $$
declare t text; acct int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select type into t from gl_accounts where code=p_code; if t is null or p_amount <= 0 or p_code='3100' then raise exception 'bad values'; end if;
  if t = 'asset' then perform post_entry('opening', null, 'رصيد افتتاحي', null, jsonb_build_array(jsonb_build_object('code',p_code,'debit',p_amount), jsonb_build_object('code','3100','credit',p_amount)), p_date);
    select id into acct from accounts where kind = case p_code when '1100' then 'cash' when '1200' then 'bank' when '1300' then 'wallet' end order by id limit 1;
    if acct is not null then insert into treasury_tx(account_id,amount,kind,note,created_by) values (acct,p_amount,'opening','رصيد افتتاحي',auth.uid()); end if;
  elsif t = 'liability' then perform post_entry('opening', null, 'رصيد افتتاحي', null, jsonb_build_array(jsonb_build_object('code','3100','debit',p_amount), jsonb_build_object('code',p_code,'credit',p_amount)), p_date);
  else raise exception 'bad values'; end if;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'opening_balance',jsonb_build_object('code',p_code,'amount',p_amount)); end $$;

create or replace function list_expenses(d_from date, d_to date) returns table(id bigint, entry_date date, memo text, account text, amount numeric) language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
begin if not is_admin() then raise exception 'forbidden'; end if;
  return query select e.id, e.entry_date, e.memo, a.name, l.debit from journal_entries e join journal_lines l on l.entry_id=e.id and l.debit>0 join gl_accounts a on a.id=l.account_id
    where e.source='expense' and e.entry_date between d_from and d_to order by e.entry_date desc, e.id desc; end $$;

create or replace function acc_statements(d_from date, d_to date, p_branch int default null) returns json language plpgsql stable security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return json_build_object('rows',(select coalesce(json_agg(x order by x.code),'[]') from (
    select a.code, a.name, a.type,
      coalesce(sum(l.debit) filter (where e.entry_date between d_from and d_to),0) as p_debit, coalesce(sum(l.credit) filter (where e.entry_date between d_from and d_to),0) as p_credit,
      coalesce(sum(l.debit) filter (where e.entry_date <= d_to),0) as c_debit, coalesce(sum(l.credit) filter (where e.entry_date <= d_to),0) as c_credit
    from gl_accounts a left join journal_lines l on l.account_id=a.id left join journal_entries e on e.id=l.entry_id and (p_branch is null or e.branch_id = p_branch)
    group by a.id) x)); end $$;

-- ترحيل المبيعات القديمة المدفوعة للقيود (مرة واحدة)
do $$ declare r invoices; begin
  for r in select * from invoices i where i.status='paid' and i.paid_at is not null and not exists (select 1 from journal_entries e where e.source='sale' and e.source_id=i.id::text) loop perform post_sale_entry(r,false); end loop; end $$;

revoke all on function post_entry(text,text,text,int,jsonb,date), post_sale_entry(invoices,boolean), create_purchase(text,int,jsonb,numeric,int,text), create_expense(int,text,numeric,text,date,int), add_opening_balance(text,numeric,date),
  list_expenses(date,date), acc_statements(date,date,int) from public;
grant execute on function create_purchase(text,int,jsonb,numeric,int,text), create_expense(int,text,numeric,text,date,int), add_opening_balance(text,numeric,date), list_expenses(date,date), acc_statements(date,date,int) to authenticated;

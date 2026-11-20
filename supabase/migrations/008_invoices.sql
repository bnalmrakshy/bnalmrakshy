-- الفواتير: كل فاتورة لها QR مختلف. النقاط والستريك بيتحسبوا من الفاتورة (مفيش QR حضور يومي). شغّله بعد 007.
create table if not exists invoices (id uuid primary key default gen_random_uuid(), token text unique not null,
  created_by uuid references profiles on delete set null, total int not null default 0, points int not null default 0,
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  claimed_by uuid references profiles on delete set null, claimed_at timestamptz, discount int not null default 0, points_earned int);
create table if not exists invoice_items (id bigserial primary key, invoice_id uuid not null references invoices on delete cascade,
  item_id int references menu_items on delete set null, name text not null, qty int not null check (qty between 1 and 100),
  price int not null, points int not null);
alter table points_ledger add column if not exists invoice_id uuid references invoices on delete set null;
create unique index if not exists one_ledger_per_invoice on points_ledger(invoice_id, reason) where invoice_id is not null;
alter table invoices enable row level security; alter table invoice_items enable row level security;
drop policy if exists i_read on invoices; drop policy if exists ii_read on invoice_items;
create policy i_read on invoices for select using (claimed_by=auth.uid() or my_role()='admin');
create policy ii_read on invoice_items for select using (exists (select 1 from invoices i where i.id=invoice_id and (i.claimed_by=auth.uid() or my_role()='admin')));
grant select on invoices, invoice_items to authenticated;

create or replace function create_invoice(lines jsonb) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; tot int:=0; pts int:=0; l jsonb; m menu_items; q int;
begin
  if my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if jsonb_typeof(lines)<>'array' or jsonb_array_length(lines) not between 1 and 30 then raise exception 'bad lines'; end if;
  insert into invoices(token,created_by,expires_at) values (replace(gen_random_uuid()::text,'-',''),auth.uid(),now()+interval '30 minutes') returning * into inv;
  for l in select * from jsonb_array_elements(lines) loop
    q := (l->>'qty')::int; select * into m from menu_items where id=(l->>'id')::int and active;
    if m.id is null or q not between 1 and 100 then raise exception 'bad item'; end if;
    insert into invoice_items(invoice_id,item_id,name,qty,price,points) values (inv.id,m.id,m.name,q,m.price,m.points);
    tot := tot + m.price*q; pts := pts + m.points*q;
  end loop;
  update invoices set total=tot, points=pts where id=inv.id;
  insert into audit_logs(actor,action,detail) values (auth.uid(),'create_invoice',jsonb_build_object('invoice',inv.id,'total',tot));
  return json_build_object('id',inv.id,'token',inv.token,'total',tot,'points',pts); end $$;

create or replace function preview_invoice(tok text) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; bal int;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok;
  if inv.id is null or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=auth.uid();
  return json_build_object('total',inv.total,'points',inv.points,'balance',bal,
    'lines',(select json_agg(json_build_object('name',name,'qty',qty,'price',price)) from invoice_items where invoice_id=inv.id)); end $$;

-- النقطة = جنيه. لو العميل استخدم نقاطه، النقاط الجديدة بتتحسب على المبلغ المدفوع بس.
create or replace function claim_invoice(tok text, use_points boolean default false) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; p profiles; s app_settings; bal int; disc int:=0; paid int; earn int; ns int; drink boolean:=false;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok for update;
  if inv.id is null or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select * into s from app_settings;
  select * into p from profiles where id=auth.uid() for update;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=p.id;
  if use_points then disc := least(bal, inv.total); end if;
  paid := inv.total - disc;
  earn := case when inv.total=0 then 0 else floor(inv.points::numeric*paid/inv.total)::int end;
  update invoices set claimed_by=p.id, claimed_at=now(), discount=disc, points_earned=earn where id=inv.id;
  if disc>0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (p.id,-disc,'redeem',inv.id); end if;
  if earn>0 then insert into points_ledger(member_id,delta,reason,invoice_id) values (p.id,earn,'invoice',inv.id); end if;
  ns := p.streak;
  if p.last_visit is distinct from today then
    ns := case when p.last_visit = today-1 then p.streak+1 else 1 end;
    insert into checkins(member_id,day) values (p.id,today);
    if ns >= s.streak_target then insert into free_drinks(member_id) values (p.id); drink:=true; ns:=0; end if;
    update profiles set streak=ns, last_visit=today where id=p.id;
  end if;
  return json_build_object('total',inv.total,'discount',disc,'paid',paid,'earned',earn,'streak',ns,'target',s.streak_target,'drink',drink); end $$;

revoke all on function create_invoice(jsonb), preview_invoice(text), claim_invoice(text,boolean) from public;
grant execute on function create_invoice(jsonb), preview_invoice(text), claim_invoice(text,boolean) to authenticated;
revoke execute on function scan_checkin(text) from authenticated; -- QR الحضور اليومي اتلغى

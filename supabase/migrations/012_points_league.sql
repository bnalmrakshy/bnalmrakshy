-- ١٠ نقط = ١ جنيه، إلغاء مشروب الجمعة المجاني، والدوري (get_league). شغّله بعد 011، مرة واحدة.
alter table app_settings add column if not exists points_per_egp int not null default 10, add column if not exists points_scaled boolean not null default false;
-- تحويل البيانات القديمة (كانت النقطة = ١ جنيه) لنظام ١٠ نقط = ١ جنيه بنفس القيمة. بيتنفّذ مرة واحدة بس.
do $$ begin if not (select points_scaled from app_settings where id=1) then
  update menu_items set points = points*10;
  update points_ledger set delta = delta*10;
  update invoice_items set points = points*10;
  update invoices set points = points*10, points_earned = points_earned*10;
  update app_settings set points_scaled = true where id=1;
end if; end $$;

create or replace function preview_invoice(tok text) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; bal int; rate int;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok;
  if inv.id is null or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select points_per_egp into rate from app_settings where id=1;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=auth.uid();
  return json_build_object('total',inv.total,'points',inv.points,'balance',bal,'rate',rate,
    'lines',(select json_agg(json_build_object('name',name,'qty',qty,'price',price)) from invoice_items where invoice_id=inv.id)); end $$;

-- الخصم بالجنيه = floor(نقاطك ÷ ١٠). النقاط الجديدة بتتحسب على المبلغ المدفوع بس. مفيش مشروب مجاني.
create or replace function claim_invoice(tok text, use_points boolean default false) returns json language plpgsql security definer set search_path=public as $$
declare inv invoices; p profiles; s app_settings; bal int; disc int:=0; paid int; earn int; ns int;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if my_role() is distinct from 'member' then raise exception 'not a member'; end if;
  select * into inv from invoices where token=tok for update;
  if inv.id is null or inv.expires_at < now() then raise exception 'invalid invoice'; end if;
  if inv.claimed_by is not null then raise exception 'already claimed'; end if;
  select * into s from app_settings where id=1;
  select * into p from profiles where id=auth.uid() for update;
  select coalesce(sum(delta),0) into bal from points_ledger where member_id=p.id;
  if use_points then disc := least(bal / s.points_per_egp, inv.total); end if;
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

revoke execute on function claim_free_drink(), use_drink(text) from authenticated;

-- الدوري: الترتيب بالنقاط المكتسبة (الاستبدال مش بيخفّض الترتيب). بيرجّع صفّك حتى لو برّه أفضل N.
create or replace function get_league(period text, lim int default 10)
returns table(rk int, display_name text, points bigint, visits bigint, is_me boolean, avatar_url text)
language sql stable security definer set search_path=public as $$
  with t as (
    select p.id, p.display_name, p.avatar_url, sum(l.delta)::bigint pts, count(*)::bigint vis
    from points_ledger l join profiles p on p.id=l.member_id
    where l.reason='invoice' and not p.suspended and p.role='member' and case period
      when 'week' then l.created_at >= date_trunc('week', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
      when 'month' then l.created_at >= date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
      else true end
    group by p.id),
  r as (select t.*, rank() over (order by pts desc, vis desc)::int rnk from t)
  select rnk, display_name, pts, vis, (id = auth.uid()), avatar_url from r where rnk <= least(lim,100) or id = auth.uid() order by rnk, display_name $$;
revoke all on function get_league(text,int) from public;
grant execute on function get_league(text,int) to anon, authenticated;

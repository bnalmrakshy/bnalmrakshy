-- داتا لوحة المعلومات التفاعلية (للأدمن فقط). شغّله بعد 013.
create or replace function dash_kpis(f timestamptz, e timestamptz, sh int) returns json language sql stable security definer set search_path=public as $$
  select json_build_object(
    'sales', coalesce(sum(i.paid_amount),0), 'count', count(i.id), 'discount', coalesce(sum(i.discount),0),
    'profit', coalesce(sum(i.paid_amount - coalesce(c.cost,0)),0), 'customers', count(distinct i.claimed_by),
    'members', (select count(*) from profiles p where p.role='member' and p.created_at>=f and p.created_at<e),
    'issued', (select coalesce(sum(delta),0) from points_ledger where reason='invoice' and created_at>=f and created_at<e),
    'redeemed', (select coalesce(-sum(delta),0) from points_ledger where reason='redeem' and created_at>=f and created_at<e))
  from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
  where i.status='paid' and i.paid_at>=f and i.paid_at<e and (sh is null or i.shift_id=sh) $$;

create or replace function dashboard_data(d_from date, d_to date, p_shift int default null) returns json language plpgsql stable security definer set search_path=public as $$
declare f timestamptz := d_from::timestamp at time zone 'Africa/Cairo'; e timestamptz := (d_to+1)::timestamp at time zone 'Africa/Cairo';
  len int := d_to - d_from + 1; pf timestamptz := (d_from-(d_to - d_from + 1))::timestamp at time zone 'Africa/Cairo'; res json;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if d_to < d_from or len > 400 then raise exception 'bad range'; end if;
  select json_build_object(
    'kpi', dash_kpis(f,e,p_shift), 'prev', dash_kpis(pf,f,p_shift),
    'daily', (select coalesce(json_agg(x order by x.d),'[]') from (select (i.paid_at at time zone 'Africa/Cairo')::date as d, sum(i.paid_amount) as sales, count(*) as n, sum(i.paid_amount - coalesce(c.cost,0)) as profit
        from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1) x),
    'by_hour', (select coalesce(json_agg(x order by x.h),'[]') from (select extract(hour from i.paid_at at time zone 'Africa/Cairo')::int as h, sum(i.paid_amount) as sales, count(*) as n, sum(i.paid_amount - coalesce(c.cost,0)) as profit
        from invoices i left join lateral (select sum(ii.cost*ii.qty) as cost from invoice_items ii where ii.invoice_id=i.id) c on true
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1) x),
    'by_weekday', (select coalesce(json_agg(x order by x.w),'[]') from (select extract(isodow from i.paid_at at time zone 'Africa/Cairo')::int as w, sum(i.paid_amount) as sales, count(*) as n
        from invoices i where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1) x),
    'by_method', (select coalesce(json_agg(x),'[]') from (select i.payment_method as method, count(*) as n, sum(i.paid_amount) as amount from invoices i
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1 order by 3 desc) x),
    'by_cashier', (select coalesce(json_agg(x),'[]') from (select s.cashier_name as name, count(*) as n, sum(i.paid_amount) as amount from invoices i join shifts s on s.id=i.shift_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1 order by 3 desc) x),
    'by_category', (select coalesce(json_agg(x),'[]') from (select coalesce(m.category,'أخرى') as name, sum(ii.qty*ii.price) as revenue from invoice_items ii join invoices i on i.id=ii.invoice_id left join menu_items m on m.id=ii.item_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by 1 order by 2 desc) x),
    'items', (select coalesce(json_agg(x),'[]') from (select ii.name, sum(ii.qty) as qty, sum(ii.qty*ii.price) as revenue, sum(ii.qty*(ii.price-ii.cost)) as profit from invoice_items ii join invoices i on i.id=ii.invoice_id
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by ii.name order by 3 desc limit 40) x),
    'members', (select coalesce(json_agg(x order by x.d),'[]') from (select (p.created_at at time zone 'Africa/Cairo')::date as d, count(*) as n from profiles p where p.role='member' and p.created_at>=f and p.created_at<e group by 1) x),
    'points', (select coalesce(json_agg(x order by x.d),'[]') from (select (l.created_at at time zone 'Africa/Cairo')::date as d, coalesce(sum(case when l.reason='invoice' then l.delta end),0) as issued, coalesce(sum(case when l.reason='redeem' then -l.delta end),0) as redeemed
        from points_ledger l where l.created_at>=f and l.created_at<e group by 1) x),
    'top_customers', (select coalesce(json_agg(x),'[]') from (select pr.display_name, sum(i.paid_amount) as spent, count(*) as visits from invoices i join profiles pr on pr.id=i.claimed_by
        where i.status='paid' and i.paid_at>=f and i.paid_at<e and (p_shift is null or i.shift_id=p_shift) group by pr.id order by 2 desc limit 10) x)
  ) into res; return res; end $$;
revoke all on function dash_kpis(timestamptz,timestamptz,int), dashboard_data(date,date,int) from public;
grant execute on function dashboard_data(date,date,int) to authenticated;

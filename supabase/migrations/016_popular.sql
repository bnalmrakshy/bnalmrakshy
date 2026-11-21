-- الأكتر طلبًا (آخر ٣٠ يوم) للمنيو والرئيسية. شغّله بعد 015.
create or replace function popular_items(lim int default 8) returns table(id int, name text, category text, price int, points int, qty bigint)
language sql stable security definer set search_path=public as $$
  select m.id, m.name, m.category, m.price, m.points, sum(ii.qty)::bigint
  from invoice_items ii join invoices i on i.id=ii.invoice_id join menu_items m on m.id=ii.item_id
  where i.status='paid' and i.paid_at > now() - interval '30 days' and m.active
  group by m.id order by 6 desc limit least(lim,20) $$;
revoke all on function popular_items(int) from public;
grant execute on function popular_items(int) to anon, authenticated;

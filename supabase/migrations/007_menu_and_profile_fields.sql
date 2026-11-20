-- المنيو (من PDF المحل) + حقول الصورة وتغيير اليوزر. آمن يتشغّل أكتر من مرة.
create table if not exists menu_items (id serial primary key, category text not null, name text not null,
  price int not null check (price>0), points int not null default 0 check (points>=0), active boolean not null default true);
alter table menu_items enable row level security;
drop policy if exists m_read on menu_items;
create policy m_read on menu_items for select using (active);
grant select on menu_items to anon, authenticated;
alter table profiles add column if not exists avatar_url text, add column if not exists username_changed_at timestamptz;
-- النقاط الافتراضية = السعر ÷ ١٠ (الأدمن هيعدّلها لكل صنف)
do $$ begin if not exists (select 1 from menu_items) then
  insert into menu_items(category,name,price,points)
  select c,n,p,round(p/10.0)::int from (values
   ('قهوة','قهوة تركي سنجل',15),('قهوة','قهوة تركي دبل',25),('قهوة','اسبريسو سنجل',20),('قهوة','اسبريسو دبل',30),('قهوة','قهوة فرنساوي',25),('قهوة','شاي',10),
   ('مشروبات','نسكافيه',25),('مشروبات','نسكافيه بلاك',15),('مشروبات','كوفي ميكس',15),('مشروبات','هوت شوكليت',25),('مشروبات','قهوة بندق قطع',30),
   ('مشروبات','كابتشينو',25),('مشروبات','لاتيه كابتشينو سنجل',25),('مشروبات','لاتيه كابتشينو دبل',40),('مشروبات','فرنساوي فليفر',25)) t(c,n,p);
  insert into menu_items(category,name,price,points)
  select c, n||' - '||u, p, round(p/10.0)::int from (values
   ('بن سادة','فاتح - وسط',560,70),('بن سادة','غامق',560,70),('بن سادة','دله',620,80),('بن سادة','اسبشيال حبشي',720,90),('بن سادة','اسبشيال كولومبي',760,95),('بن سادة','توليفة العميد',890,110),('بن سادة','اسبريسو 80/20',850,105),
   ('بن محوج','فاتح - وسط',640,80),('بن محوج','غامق',640,80),('بن محوج','دله',700,85),('بن محوج','اسبشيال حبشي',720,90),('بن محوج','اسبشيال كولومبي',840,105),('بن محوج','توليفة العميد',980,125),('بن محوج','اسبريسو 50/50',750,95),
   ('فليفر','نسكافيه بلاك',1200,150),('فليفر','نسكافيه جولد',1600,200),('فليفر','بندق قطع',600,75),('فليفر','كابتشينو',550,70),('فليفر','كوفي ميكس',520,65),('فليفر','كاكاو محلي',500,60),('فليفر','نسكافيه بلاك ناعم',1100,140),('فليفر','فليفر',520,65)
  ) t(c,n,kg,e), lateral (values ('١ كجم',t.kg),('١/٨ كجم',t.e)) x(u,p);
end if; end $$;

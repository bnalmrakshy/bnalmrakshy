"use client";
import { useEffect, useState } from "react";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number; points: number };
export default function Menu() {
  const [items, setItems] = useState<It[] | null>(null); const [pts, setPts] = useState<number | null>(null); const [err, setErr] = useState(false);
  useEffect(() => { (async () => {
    const r = await sb.from("menu_items").select("id,category,name,price,points").order("id");
    if (r.error) return setErr(true); setItems(r.data);
    const { data: { session } } = await sb.auth.getSession();
    if (session) { const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); if (!l.error) setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0)); }
  })(); }, []);
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل المنيو. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!items) return <main className="min-h-[60vh] grid place-items-center text-roast">بنحمّل المنيو...</main>;
  const cats = Array.from(new Set(items.map(i => i.category)));
  return (
    <main className="px-6 py-12 md:px-16 max-w-3xl">
      <h1 className="text-4xl font-black">المنيو</h1>
      <p className="mt-3 text-roast leading-7">{pts === null ? "كل طلب بيجمعلك نقط، وكل نقطة بجنيه. سجّل حساب عشان تشوف باقيلك كام نقطة لكل مشروب." : <>رصيدك <b className="num">{ar(pts)}</b> نقطة، والنقطة بجنيه.</>}</p>
      {cats.map(c => (
        <section key={c} className="mt-10">
          <h2 className="text-xl font-black border-b-2 border-espresso pb-2">{c}</h2>
          <ul>{items.filter(i => i.category === c).map(i => { const left = Math.max(0, i.price - (pts ?? 0));
            return <li key={i.id} className="py-4 border-b border-sand flex items-center justify-between gap-4">
              <div><div className="font-bold">{i.name}</div><div className="text-xs text-roast/70 mt-1">يجمعلك {ar(i.points)} نقطة</div></div>
              <div className="text-left shrink-0"><div className="text-2xl font-black num">{ar(i.price)} <span className="text-sm">ج</span></div>
                {pts !== null && <div className="text-xs text-roast num">{left === 0 ? "تقدر تاخده بنقطك" : `باقيلك ${ar(left)} نقطة`}</div>}</div>
            </li>; })}</ul>
        </section>))}
    </main>);
}

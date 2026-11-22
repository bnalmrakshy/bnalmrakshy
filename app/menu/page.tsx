"use client";
import { useEffect, useState } from "react";
import ItemArt from "@/components/ItemArt";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number };
export default function Menu() {
  const [items, setItems] = useState<It[] | null>(null); const [pts, setPts] = useState<number | null>(null); const [err, setErr] = useState(false); const [cat, setCat] = useState(""); const [q, setQ] = useState("");
  useEffect(() => { (async () => {
    const r = await sb.from("menu_items").select("id,category,name,price").order("id"); if (r.error) return setErr(true); setItems(r.data);
    const { data: { session } } = await sb.auth.getSession();
    if (session) { const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); if (!l.error) setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0)); }
  })(); }, []);
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل المنيو. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!items) return <main className="mx-auto max-w-lg px-5 pt-5 space-y-3"><Sk className="h-12" />{[0, 1, 2, 3, 4].map(k => <Sk key={k} className="h-16" />)}</main>;
  const cats = Array.from(new Set(items.map(i => i.category))); const cur = cat || cats[0];
  const shown = q ? items.filter(i => i.name.includes(q)) : items.filter(i => i.category === cur);
  return (
    <main className="mx-auto max-w-lg lg:max-w-4xl px-5 lg:px-8 pt-5 pb-4">
      <div className="flex items-end justify-between gap-3"><h1 className="text-2xl font-black">المنيو</h1>{pts !== null && <p className="text-xs text-roast num">رصيدك {ar(pts)} نقطة = {ar(Math.floor(pts / 10))} جنيه</p>}</div>
      <div className="sticky top-14 z-20 bg-white -mx-5 px-5 lg:-mx-8 lg:px-8 pt-3 pb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر" />
        {!q && <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">{cats.map(c => <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition ${cur === c ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{c}</button>)}</div>}
      </div>
      {shown.length === 0 ? <p className="mt-6 text-roast">مفيش نتائج.</p> : <ul className="mt-2 grid gap-2.5 lg:grid-cols-2">{shown.map(i => (
        <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-sand/60 p-3"><ItemArt name={i.name} cat={i.category} size={48} /><span className="flex-1 font-bold leading-6">{i.name}</span>
          <span className="text-xl font-black num shrink-0">{ar(i.price)}<span className="text-xs font-bold mr-1">ج</span></span></li>))}</ul>}
    </main>);
}

"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number; points: number };
export default function Menu() {
  const [items, setItems] = useState<It[] | null>(null); const [pts, setPts] = useState<number | null>(null); const [err, setErr] = useState(false); const [cat, setCat] = useState(""); const [q, setQ] = useState("");
  useEffect(() => { (async () => {
    const r = await sb.from("menu_items").select("id,category,name,price,points").order("id");
    if (r.error) return setErr(true); setItems(r.data);
    const { data: { session } } = await sb.auth.getSession();
    if (session) { const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); if (!l.error) setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0)); }
  })(); }, []);
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل المنيو. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!items) return <main className="mx-auto max-w-lg px-5 pt-5 space-y-3"><Sk className="h-24 rounded-3xl" /><Sk className="h-12" />{[0, 1, 2, 3, 4].map(k => <Sk key={k} className="h-24" />)}</main>;
  const cats = Array.from(new Set(items.map(i => i.category))); const shown = items.filter(i => (!cat || i.category === cat) && (!q || i.name.includes(q)));
  const chip = (a: boolean) => `shrink-0 px-4 py-2 rounded-full text-sm font-bold transition ${a ? "bg-espresso text-cream" : "bg-sand text-roast"}`;
  return (
    <main className="mx-auto max-w-lg px-5 pt-5">
      {pts !== null ? <div className="rounded-3xl bg-espresso text-cream p-5 flex items-center justify-between"><div><p className="text-cream/60 text-xs">رصيدك</p><p className="text-4xl font-black num">{ar(pts)} <span className="text-sm text-brass">نقطة</span></p></div><p className="text-xs text-cream/60 text-left leading-6">النقطة = ١ جنيه<br />خصم على أي صنف</p></div>
        : <p className="rounded-2xl bg-sand p-4 text-sm text-roast leading-7">كل طلب بيجمعلك نقط. <a href="/register" className="underline font-bold">سجّل حساب</a> وشوف باقيلك كام نقطة لكل صنف.</p>}
      <div className="sticky top-14 z-20 bg-white -mx-5 px-5 pt-3 pb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر في المنيو" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3"><button onClick={() => setCat("")} className={chip(!cat)}>الكل</button>{cats.map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}</div>
      </div>
      {shown.length === 0 ? <p className="mt-6 text-roast">مفيش نتائج.</p> : <ul className="space-y-3 pb-4">{shown.map((i, idx) => { const left = Math.max(0, i.price - (pts ?? 0));
        return <motion.li key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 8) * .03 }} className="rounded-2xl bg-sand/60 p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black leading-6">{i.name}</p><p className="text-xs text-roast/70 mt-0.5">{i.category}</p></div>
            <p className="text-3xl font-black num leading-none shrink-0">{ar(i.price)}<span className="text-xs font-bold mr-1">ج</span></p></div>
          <div className="mt-3 flex items-center gap-3"><span className="text-[11px] font-bold bg-espresso text-cream rounded-full px-2.5 py-1 num shrink-0">+{ar(i.points)} نقطة</span>
            {pts !== null && <div className="flex-1"><div className="h-1.5 rounded-full bg-white overflow-hidden"><div className="h-full bg-brass transition-all" style={{ width: Math.min(100, (pts / i.price) * 100) + "%" }} /></div>
              <p className="text-[11px] text-roast mt-1 num">{left === 0 ? "تقدر تاخده بنقطك" : `باقيلك ${ar(left)} نقطة`}</p></div>}</div>
        </motion.li>; })}</ul>}
    </main>);
}

"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ItemArt from "@/components/ItemArt";
import Icon from "@/components/Icons";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number; points: number };
export default function Menu() {
  const [items, setItems] = useState<It[] | null>(null); const [pop, setPop] = useState<It[]>([]); const [pts, setPts] = useState<number | null>(null); const [err, setErr] = useState(false);
  const [cat, setCat] = useState(""); const [q, setQ] = useState(""); const [favs, setFavs] = useState<number[]>([]); const [onlyFav, setOnlyFav] = useState(false);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem("favs") ?? "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => { (async () => {
    const r = await sb.from("menu_items").select("id,category,name,price,points").order("id"); if (r.error) return setErr(true); setItems(r.data);
    sb.rpc("popular_items", { lim: 6 }).then(p => { if (!p.error) setPop(p.data ?? []); });
    const { data: { session } } = await sb.auth.getSession();
    if (session) { const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); if (!l.error) setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0)); }
  })(); }, []);
  const toggle = (id: number) => setFavs(f => { const n = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; try { localStorage.setItem("favs", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل المنيو. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!items) return <main className="mx-auto max-w-lg px-5 pt-5 space-y-3"><Sk className="h-8 w-2/3" /><Sk className="h-20 rounded-3xl" /><Sk className="h-12" />{[0, 1, 2, 3].map(k => <Sk key={k} className="h-24" />)}</main>;
  const cats = Array.from(new Set(items.map(i => i.category))); const egp = pts === null ? 0 : Math.floor(pts / 10);
  const flat = !!(cat || q || onlyFav); const shown = items.filter(i => (!cat || i.category === cat) && (!q || i.name.includes(q)) && (!onlyFav || favs.includes(i.id)));
  const groups: [string, It[]][] = flat ? [[onlyFav ? "المفضلة" : cat || "النتائج", shown]] : cats.map(c => [c, items.filter(i => i.category === c)]);
  const chip = (a: boolean) => `shrink-0 px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1.5 ${a ? "bg-espresso text-cream" : "bg-sand text-roast"}`;
  const card = (i: It, k: number) => { const cost = i.price * 10; const ok = pts !== null && pts >= cost; const fav = favs.includes(i.id);
    return (
      <motion.li key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 8) * .03 }} className="rounded-3xl bg-sand/60 p-3.5">
        <div className="flex items-center gap-3"><ItemArt name={i.name} cat={i.category} size={60} />
          <div className="flex-1 min-w-0"><p className="font-black leading-6">{i.name}</p>
            <p className="text-xs text-roast flex items-center gap-1 mt-0.5 num"><Icon name="coin" size={14} />{ar(i.points)} نقطة لما تطلبه</p></div>
          <div className="text-left shrink-0"><p className="text-2xl font-black num leading-none">{ar(i.price)}<span className="text-xs font-bold mr-1">ج</span></p><p className="text-[11px] text-roast mt-1 num">أو {ar(cost)} نقطة</p></div>
          <button onClick={() => toggle(i.id)} aria-label={fav ? "شيل من المفضلة" : "ضيف للمفضلة"} aria-pressed={fav} className="p-1.5 active:scale-75 transition"><svg viewBox="0 0 24 24" width="22" height="22" fill={fav ? "#B07B52" : "none"} stroke={fav ? "#B07B52" : "#4A2F20"} strokeWidth="1.8" strokeLinejoin="round" aria-hidden><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" /></svg></button></div>
        {ok && <p className="mt-2.5 text-xs font-bold bg-espresso text-cream rounded-full px-3 py-1.5 inline-block">تقدر تاخده بنقاطك</p>}
      </motion.li>); };
  return (
    <main className="mx-auto max-w-lg lg:max-w-6xl px-5 lg:px-8 pt-5 pb-4">
      <h1 className="text-3xl font-black leading-tight">إيه اللي هتشربه النهارده؟</h1>
      {pts !== null ? <div className="mt-4 rounded-3xl bg-espresso text-cream p-5 flex items-center justify-between"><div><p className="text-cream/60 text-xs">رصيدك</p><p className="text-4xl font-black num">{ar(pts)} <span className="text-sm text-brass">نقطة</span></p></div>
        <div className="text-left"><p className="text-2xl font-black num">{ar(egp)} <span className="text-sm text-brass">جنيه</span></p><p className="text-[11px] text-cream/60 mt-1">كل ١٠ نقط بجنيه</p></div></div>
        : <a href="/register" className="mt-4 block rounded-2xl bg-sand p-4 text-sm font-bold leading-7">كل طلب بيجمعلك نقط تخصمها من فاتورتك. سجّل في دقيقة ←</a>}
      {pop.length > 0 && !flat && <section className="mt-6"><h2 className="font-black flex items-center gap-1.5"><Icon name="flame" size={18} />الأكتر طلبًا</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">{pop.map(i => <div key={i.id} className="shrink-0 w-44 rounded-2xl bg-espresso text-cream p-3"><p className="font-black text-sm leading-5 min-h-[40px]">{i.name}</p><p className="mt-2 text-xl font-black num">{ar(i.price)} <span className="text-xs">ج</span></p></div>)}</div></section>}
      <div className="sticky top-14 z-20 bg-white -mx-5 px-5 lg:-mx-8 lg:px-8 pt-3 pb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر على مشروبك" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3"><button onClick={() => { setCat(""); setOnlyFav(false); }} className={chip(!cat && !onlyFav)}>الكل</button>
          <button onClick={() => { setOnlyFav(!onlyFav); setCat(""); }} className={chip(onlyFav)}><Icon name="heart" size={15} />المفضلة</button>{cats.map(c => <button key={c} onClick={() => { setCat(c); setOnlyFav(false); }} className={chip(cat === c)}>{c}</button>)}</div>
      </div>
      {groups.map(([g, list]) => <section key={g} className="mt-4"><h2 className="font-black text-lg mb-3">{g}</h2>
        {list.length === 0 ? <p className="text-roast">{onlyFav ? "لسه ماضفتش حاجة للمفضلة. اضغط القلب جنب أي صنف." : "مفيش نتائج."}</p> : <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{list.map((i, k) => card(i, k))}</ul>}</section>)}
    </main>);
}

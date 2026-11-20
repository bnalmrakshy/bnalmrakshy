"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number; points: number; active: boolean };
export default function MenuAdmin() {
  const [items, setItems] = useState<It[] | null>(null); const [msg, setMsg] = useState(""); const [q, setQ] = useState(""); const [nw, setNw] = useState({ category: "", name: "", price: "", points: "" });
  const load = async () => { const r = await sb.from("menu_items").select("id,category,name,price,points,active").order("id"); r.error ? setMsg("تعذّر تحميل المنيو.") : setItems(r.data); };
  useEffect(() => { load(); }, []);
  const edit = (id: number, k: "price" | "points" | "active", v: number | boolean) => setItems(a => a!.map(i => i.id === id ? { ...i, [k]: v } : i));
  async function save(i: It) { const r = await sb.rpc("admin_update_item", { iid: i.id, newprice: i.price, newpoints: i.points, isactive: i.active }); setMsg(r.error ? "تعذّر الحفظ (راجع الأرقام)." : `اتحفظ: ${i.name}`); }
  async function add(e: React.FormEvent) {
    e.preventDefault(); const r = await sb.rpc("admin_add_item", { cat: nw.category, nm: nw.name, pr: +nw.price, pts: +nw.points });
    if (r.error) return setMsg("تعذّرت الإضافة (راجع البيانات)."); setNw({ category: "", name: "", price: "", points: "" }); setMsg("اتضاف."); load();
  }
  const inp = "border-b border-roast/30 bg-transparent py-1 outline-none focus:border-brass";
  if (!items) return <p className="mt-6 text-roast/60">{msg || "بنحمّل..."}</p>;
  return (
    <section className="mt-6">
      <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <input className={inp} placeholder="القسم" value={nw.category} onChange={e => setNw({ ...nw, category: e.target.value })} />
        <input className={inp} placeholder="الاسم" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} />
        <input className={inp} type="number" placeholder="السعر" value={nw.price} onChange={e => setNw({ ...nw, price: e.target.value })} />
        <input className={inp} type="number" placeholder="النقاط" value={nw.points} onChange={e => setNw({ ...nw, points: e.target.value })} />
        <button className="bg-espresso text-cream font-bold py-2">إضافة صنف</button></form>
      {msg && <p role="status" className="mt-3 text-caramel font-semibold">{msg}</p>}
      <input className={inp + " w-full mt-6"} placeholder="دوّر في المنيو" value={q} onChange={e => setQ(e.target.value)} />
      <ul className="mt-2">{items.filter(i => !q || i.name.includes(q) || i.category.includes(q)).map(i => (
        <li key={i.id} className={`py-3 border-b border-sand flex flex-wrap items-center gap-3 ${i.active ? "" : "opacity-50"}`}>
          <div className="flex-1 min-w-[10rem]"><div className="font-bold text-sm">{i.name}</div><div className="text-xs text-roast/70">{i.category}</div></div>
          <label className="text-xs">سعر <input type="number" className={inp + " w-20"} value={i.price} onChange={e => edit(i.id, "price", +e.target.value)} /></label>
          <label className="text-xs">نقاط <input type="number" className={inp + " w-20"} value={i.points} onChange={e => edit(i.id, "points", +e.target.value)} /></label>
          <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={i.active} onChange={e => edit(i.id, "active", e.target.checked)} />ظاهر</label>
          <button onClick={() => save(i)} className="underline text-sm font-bold">حفظ</button></li>))}</ul>
    </section>);
}

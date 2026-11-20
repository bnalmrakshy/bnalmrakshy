"use client";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number; points: number };
type Inv = { id: string; token: string; total: number; points: number };
export default function InvoicePanel() {
  const [items, setItems] = useState<It[]>([]); const [qty, setQty] = useState<Record<number, number>>({}); const [q, setQ] = useState("");
  const [inv, setInv] = useState<Inv | null>(null); const [st, setSt] = useState<any>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from("menu_items").select("id,category,name,price,points").order("id").then(r => r.error ? setMsg("تعذّر تحميل المنيو.") : setItems(r.data)); }, []);
  const lines = useMemo(() => items.filter(i => (qty[i.id] ?? 0) > 0), [items, qty]);
  const total = lines.reduce((a, i) => a + i.price * qty[i.id], 0), pts = lines.reduce((a, i) => a + i.points * qty[i.id], 0);
  const bump = (id: number, d: number) => setQty(o => ({ ...o, [id]: Math.max(0, Math.min(100, (o[id] ?? 0) + d)) }));
  async function create() {
    setBusy(true); setMsg(""); const r = await sb.rpc("create_invoice", { lines: lines.map(i => ({ id: i.id, qty: qty[i.id] })) }); setBusy(false);
    if (r.error) return setMsg("تعذّر إنشاء الفاتورة."); setInv(r.data); setSt(null);
  }
  useEffect(() => {
    if (!inv || st?.claimed_at) return;
    const t = setInterval(async () => { const r = await sb.from("invoices").select("claimed_at,discount,total,points_earned,claimer:claimed_by(display_name)").eq("id", inv.id).single(); if (r.data) setSt(r.data); }, 3000);
    return () => clearInterval(t);
  }, [inv, st?.claimed_at]);
  if (inv) return (
    <section className="mt-6 max-w-sm text-center">
      <p className="text-lg font-black num">إجمالي الفاتورة {ar(inv.total)} ج · {ar(inv.points)} نقطة</p>
      <div className="bg-white p-5 inline-block mt-4 border border-sand"><QRCodeSVG value={`${location.origin}/checkin?t=${inv.token}`} size={240} /></div>
      {st?.claimed_at ? <p role="status" className="mt-4 leading-8 font-bold">تم: {st.claimer?.display_name ?? "عميل"} {st.discount > 0 ? `استخدم ${ar(st.discount)} نقطة. ` : ""}المطلوب دفعه <span className="text-2xl num">{ar(st.total - st.discount)}</span> ج، وجمع {ar(st.points_earned)} نقطة.</p>
        : <p className="mt-4 text-roast">مستني العميل يمسح الكود... (صالح ٣٠ دقيقة)</p>}
      <button onClick={() => { setInv(null); setSt(null); setQty({}); }} className="mt-6 w-full bg-espresso text-cream font-bold py-4">فاتورة جديدة</button>
    </section>);
  const shown = items.filter(i => !q || i.name.includes(q) || i.category.includes(q));
  return (
    <section className="mt-6 max-w-xl">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر في المنيو" className="w-full border-b border-roast/30 py-2 outline-none focus:border-brass bg-transparent" />
      <ul className="mt-2 max-h-[55vh] overflow-y-auto">{shown.map(i => (
        <li key={i.id} className="py-3 border-b border-sand flex items-center gap-3">
          <div className="flex-1"><div className="font-bold text-sm">{i.name}</div><div className="text-xs text-roast/70 num">{i.category} · {ar(i.price)} ج · {ar(i.points)} نقطة</div></div>
          <div className="flex items-center gap-3" dir="ltr">
            <button onClick={() => bump(i.id, -1)} className="w-9 h-9 border border-espresso active:bg-sand" aria-label="نقص">−</button>
            <span className="w-6 text-center num">{qty[i.id] ?? 0}</span>
            <button onClick={() => bump(i.id, 1)} className="w-9 h-9 bg-espresso text-cream" aria-label="زوّد">+</button></div>
        </li>))}</ul>
      <div className="sticky bottom-0 bg-cream border-t border-espresso pt-4 pb-2 mt-2">
        <p className="font-black num">الإجمالي {ar(total)} ج · يجمع العميل {ar(pts)} نقطة</p>
        <button disabled={!lines.length || busy} onClick={create} className="mt-3 w-full bg-espresso text-cream font-bold py-4 disabled:opacity-40">{busy ? "لحظة..." : "اطلع QR الفاتورة"}</button>
        {msg && <p role="alert" className="mt-2 text-caramel">{msg}</p>}
      </div>
    </section>);
}

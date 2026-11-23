"use client";
import { useEffect, useState } from "react";
import Gate from "@/components/Gate";
import ItemArt from "@/components/ItemArt";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type It = { id: number; category: string; name: string; price: number };
const ERR: Record<string, string> = { "area not available": "التوصيل مش متاح للمنطقة دي.", "below minimum": "الطلب أقل من الحد الأدنى للمنطقة دي.", "bad contact": "اكتب العنوان بالتفصيل ورقم موبايل صحيح.", "too many open orders": "عندك ٣ طلبات شغّالة. استنى لحد ما يخلصوا." };
function Order() {
  const [items, setItems] = useState<It[] | null>(null); const [areas, setAreas] = useState<any[] | null>(null); const [cart, setCart] = useState<Record<number, number>>({}); const [cat, setCat] = useState(""); const [step, setStep] = useState(1);
  const [f, setF] = useState({ area: "", address: "", phone: "", note: "" }); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { try { setF(x => ({ ...x, phone: localStorage.getItem("ord_phone") ?? "", address: localStorage.getItem("ord_addr") ?? "", area: localStorage.getItem("ord_area") ?? "" })); } catch { /* ignore */ }
    sb.from("menu_items").select("id,category,name,price").order("id").then(r => setItems(r.data ?? [])); sb.from("areas").select("id,name,delivery_fee,min_order").eq("delivery_enabled", true).eq("active", true).order("id").then(r => setAreas(r.data ?? [])); }, []);
  if (!items || !areas) return <main className="mx-auto max-w-lg px-5 pt-5 space-y-3">{[0, 1, 2, 3].map(k => <Sk key={k} className="h-16" />)}</main>;
  if (areas.length === 0) return <main className="mx-auto max-w-lg px-5 pt-10 text-center"><h1 className="text-2xl font-black">التوصيل</h1><p className="mt-3 text-roast leading-7">خدمة التوصيل لسه مش متاحة. هنعلن أول ما تبدأ.</p></main>;
  const cats = Array.from(new Set(items.map(i => i.category))); const cur = cat || cats[0]; const lines = items.filter(i => (cart[i.id] ?? 0) > 0); const sub = lines.reduce((a, i) => a + i.price * cart[i.id], 0);
  const area = areas.find(a => String(a.id) === f.area); const fee = area?.delivery_fee ?? 0; const bump = (id: number, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(50, (c[id] ?? 0) + d)) }));
  async function send() {
    setBusy(true); setMsg(""); const r = await sb.rpc("place_order", { p_lines: lines.map(i => ({ id: i.id, qty: cart[i.id] })), p_area: +f.area, p_address: f.address, p_phone: f.phone, p_note: f.note || null }); setBusy(false);
    if (r.error) return setMsg(ERR[Object.keys(ERR).find(k => r.error!.message.includes(k)) ?? ""] ?? "حصلت مشكلة، جرّب تاني.");
    try { localStorage.setItem("ord_phone", f.phone); localStorage.setItem("ord_addr", f.address); localStorage.setItem("ord_area", f.area); } catch { /* ignore */ } location.href = "/orders";
  }
  return (
    <main className="mx-auto max-w-lg lg:max-w-3xl px-5 pt-5 pb-32">
      <h1 className="text-2xl font-black">{step === 1 ? "اطلب توصيل" : "بيانات التوصيل"}</h1>
      {step === 1 ? <>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-4">{cats.map(c => <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold ${cur === c ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{c}</button>)}</div>
        <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">{items.filter(i => i.category === cur).map(i => (
          <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-sand/60 p-3"><ItemArt name={i.name} cat={i.category} size={48} /><span className="flex-1"><span className="block font-bold leading-6">{i.name}</span><span className="block text-sm text-roast num">{ar(i.price)} ج</span></span>
            <div className="flex items-center gap-2" dir="ltr"><button onClick={() => bump(i.id, -1)} className="w-10 h-10 border border-espresso" aria-label="نقص">−</button><span className="w-6 text-center num font-bold">{cart[i.id] ?? 0}</span><button onClick={() => bump(i.id, 1)} className="w-10 h-10 bg-espresso text-cream" aria-label="زوّد">+</button></div></li>))}</ul></> :
        <div className="mt-4 space-y-3">
          <select value={f.area} onChange={e => setF({ ...f, area: e.target.value })} className="w-full"><option value="">اختار منطقتك</option>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input placeholder="العنوان بالتفصيل (عمارة، دور، علامة مميزة)" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="w-full" />
          <input placeholder="رقم الموبايل" dir="ltr" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="w-full" style={{ textAlign: "right" }} />
          <input placeholder="ملاحظات (اختياري)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="w-full" />
          <div className="rounded-2xl bg-sand/60 p-4 text-sm space-y-1"><p className="flex justify-between"><span>الطلب</span><b className="num">{ar(sub)} ج</b></p><p className="flex justify-between"><span>التوصيل</span><b className="num">{area ? `${ar(fee)} ج` : "—"}</b></p><p className="flex justify-between text-lg font-black pt-1 border-t border-white"><span>الإجمالي</span><span className="num">{ar(sub + fee)} ج</span></p><p className="text-xs text-roast pt-1">الدفع عند الاستلام.{area?.min_order ? ` أقل طلب ${ar(area.min_order)} ج.` : ""}</p></div>
          {msg && <p role="alert" className="text-caramel font-bold text-sm">{msg}</p>}</div>}
      <div className="fixed bottom-[76px] lg:bottom-4 inset-x-0 z-30 px-5"><div className="mx-auto max-w-lg lg:max-w-3xl">
        {step === 1 ? <button disabled={!lines.length} onClick={() => setStep(2)} className="w-full bg-espresso text-cream font-black py-4 shadow-lg disabled:opacity-40">التالي · {ar(sub)} ج</button>
          : <div className="flex gap-2"><button onClick={() => setStep(1)} className="px-6 border border-espresso bg-white font-bold">رجوع</button><button disabled={busy || !f.area || !f.address || !f.phone} onClick={send} className="flex-1 bg-espresso text-cream font-black py-4 shadow-lg disabled:opacity-40">{busy ? "لحظة..." : "أكّد الطلب"}</button></div>}</div></div>
    </main>);
}
export default function Page() { return <Gate>{() => <Order />}</Gate>; }

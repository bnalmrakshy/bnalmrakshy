"use client";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Gate, { Me } from "@/components/Gate";
import { btn } from "@/components/ui";
import { sb, ar } from "@/lib/supabase";
import { METHOD, M } from "@/lib/erp";
type It = { id: number; category: string; name: string; price: number; points: number };
type Inv = { id: string; token: string; total: number; points: number; expires_at: string };
const ERR: Record<string, string> = { "no open shift": "افتح الشيفت الأول.", "invoice not open": "الفاتورة دي اتقفلت قبل كده.", "customer required": "اختار العميل للبيع الآجل.", forbidden: "مش مسموح." };
const why = (m: string) => ERR[Object.keys(ERR).find(k => m.includes(k)) ?? ""] ?? "حصلت مشكلة: " + m;
function Pos({ me }: { me: Me }) {
  const [shift, setShift] = useState<any>(undefined); const [items, setItems] = useState<It[]>([]); const [cart, setCart] = useState<Record<number, number>>({});
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [inv, setInv] = useState<Inv | null>(null); const [st, setSt] = useState<any>(null); const [left, setLeft] = useState(0);
  const [mins, setMins] = useState(2); const [method, setMethod] = useState("cash"); const [custs, setCusts] = useState<any[]>([]); const [cust, setCust] = useState(""); const [nc, setNc] = useState({ name: "", phone: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [openCash, setOpenCash] = useState(""); const [closing, setClosing] = useState(false); const [counted, setCounted] = useState("");
  const loadShift = useCallback(async () => { const r = await sb.from("shifts").select("*").eq("cashier_id", me.id).is("closed_at", null).maybeSingle(); setShift(r.data ?? null); }, [me.id]);
  const loadCusts = useCallback(async () => { const r = await sb.from("customers").select("id,name,phone").order("name"); setCusts(r.data ?? []); }, []);
  useEffect(() => { loadShift(); loadCusts(); sb.from("menu_items").select("id,category,name,price,points").eq("active", true).order("id").then(r => setItems(r.data ?? [])); }, [loadShift, loadCusts]);
  useEffect(() => { if (!inv) return; const t = setInterval(async () => { const r = await sb.from("invoices").select("claimed_at,discount,total,points_earned,status,claimer:claimed_by(display_name)").eq("id", inv.id).single(); if (r.data) setSt(r.data); }, 2500); return () => clearInterval(t); }, [inv]);
  useEffect(() => { if (!inv) return; const t = setInterval(() => setLeft(Math.max(0, Math.round((+new Date(inv.expires_at) - Date.now()) / 1000))), 500); return () => clearInterval(t); }, [inv]);
  const lines = items.filter(i => (cart[i.id] ?? 0) > 0); const total = lines.reduce((a, i) => a + i.price * cart[i.id], 0); const pts = lines.reduce((a, i) => a + i.points * cart[i.id], 0);
  const cats = Array.from(new Set(items.map(i => i.category))); const shown = items.filter(i => (!cat || i.category === cat) && (!q || i.name.includes(q)));
  const bump = (id: number, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(100, (c[id] ?? 0) + d)) }));
  const due = inv ? inv.total - (st?.discount ?? 0) : 0;
  async function openShift(e: React.FormEvent) { e.preventDefault(); setBusy(true); const r = await sb.rpc("open_shift", { opening: +openCash || 0 }); setBusy(false); if (r.error) return setMsg(why(r.error.message)); setMsg(""); loadShift(); }
  async function closeShift(e: React.FormEvent) { e.preventDefault(); setBusy(true); const r = await sb.rpc("close_shift", { counted: +counted || 0 }); setBusy(false); if (r.error) return setMsg(why(r.error.message)); setClosing(false); setShift(null); setMsg(`اتقفل الشيفت. الفرق في الكاش: ${M(r.data.diff)} ج`); }
  async function create() {
    setBusy(true); setMsg(""); const r = await sb.rpc("create_invoice", { lines: lines.map(i => ({ id: i.id, qty: cart[i.id] })), mins }); setBusy(false);
    if (r.error) return setMsg(why(r.error.message)); setInv(r.data); setSt(null); setMethod("cash"); setCust("");
  }
  async function pay() {
    if (!inv) return; setBusy(true); const r = await sb.rpc("pay_invoice", { inv_id: inv.id, method, cust: method === "credit" && cust ? +cust : null }); setBusy(false);
    if (r.error) return setMsg(why(r.error.message)); setMsg(`تم الدفع: ${M(r.data.paid)} ج (${METHOD[method]})`); setInv(null); setSt(null); setCart({});
  }
  async function cancel() { if (!inv) return; const r = await sb.rpc("cancel_invoice", { inv_id: inv.id }); if (r.error) return setMsg(why(r.error.message)); setInv(null); setSt(null); setMsg("اتلغت الفاتورة."); }
  async function addCust() { if (!nc.name.trim()) return; const r = await sb.rpc("add_customer", { p_name: nc.name, p_phone: nc.phone || null }); if (r.error) return setMsg(why(r.error.message)); setNc({ name: "", phone: "" }); await loadCusts(); setCust(String(r.data)); }
  const chip = (a: boolean) => `shrink-0 px-4 py-2 rounded-full text-sm font-bold ${a ? "bg-espresso text-cream" : "bg-sand text-roast"}`;
  if (shift === undefined) return <main className="min-h-[60vh] grid place-items-center text-roast">لحظة...</main>;
  if (!shift) return (
    <main className="mx-auto max-w-md px-5 pt-8"><h1 className="text-3xl font-black">الكاشير</h1><p className="text-roast mt-2">افتح الشيفت بتاعك عشان تبدأ تبيع.</p>
      <form onSubmit={openShift} className="mt-6 rounded-3xl bg-sand/60 p-5 space-y-4"><label className="block text-sm font-bold">الكاش اللي في الدُرج دلوقتي (ج)<input type="number" min={0} className="mt-1.5 w-full" value={openCash} onChange={e => setOpenCash(e.target.value)} /></label>
        <button disabled={busy} className={btn + " w-full py-3.5"}>افتح الشيفت</button></form>{msg && <p role="status" className="mt-4 text-caramel font-bold">{msg}</p>}</main>);
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-4">
      <div className="flex items-center justify-between gap-3 mb-4"><p className="font-black">شيفت #{ar(shift.id)} · {me.display_name} <span className="text-xs text-roast font-normal">من {new Date(shift.opened_at).toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" })}</span></p>
        <button onClick={() => setClosing(true)} className="text-sm underline font-bold">قفل الشيفت</button></div>
      {msg && <p role="status" className="mb-3 rounded-xl bg-espresso text-cream px-4 py-3 text-sm font-bold">{msg}</p>}
      <div className="lg:grid lg:grid-cols-[1fr_24rem] lg:gap-6 lg:items-start">
        <section>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر على صنف" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3"><button onClick={() => setCat("")} className={chip(!cat)}>الكل</button>{cats.map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}</div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">{shown.map(i => (
            <button key={i.id} disabled={!!inv} onClick={() => bump(i.id, 1)} className="relative rounded-2xl bg-sand/60 p-3 text-right min-h-[84px] active:scale-95 transition disabled:opacity-40">
              <span className="block font-bold text-sm leading-5">{i.name}</span><span className="block mt-1 font-black num">{M(i.price)} ج</span>
              {(cart[i.id] ?? 0) > 0 && <span className="absolute top-2 left-2 min-w-6 h-6 px-1 rounded-full bg-espresso text-cream text-xs font-black grid place-items-center num">{ar(cart[i.id])}</span>}</button>))}</div>
        </section>
        <aside className="mt-5 lg:mt-0 lg:sticky lg:top-20 rounded-3xl border border-sand p-4 bg-white">
          {inv ? <div className="text-center">
            <p className="text-sm text-roast">فاتورة بـ</p><p className="text-4xl font-black num">{M(inv.total)} ج</p>
            <div className="bg-white p-3 inline-block mt-3 border border-sand rounded-2xl"><QRCodeSVG value={`${location.origin}/checkin?t=${inv.token}`} size={190} /></div>
            <p className="mt-2 text-xl font-black num" dir="ltr">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</p>
            {st?.claimed_at ? <p role="status" className="mt-2 text-sm font-bold leading-7">{st.claimer?.display_name ?? "العميل"} مسح الكود{st.discount > 0 ? ` واستخدم نقاطه (خصم ${M(st.discount)} ج)` : ""}. جمع {ar(st.points_earned)} نقطة.</p>
              : <p className="mt-2 text-sm text-roast">{left === 0 ? "الكود انتهى (تقدر تدفع عادي)." : "مستني العميل يمسح الكود..."}</p>}
            <p className="mt-3 text-sm text-roast">المطلوب دفعه</p><p className="text-5xl font-black num">{M(due)} <span className="text-lg">ج</span></p>
            <div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(METHOD).map(([k, l]) => <button key={k} onClick={() => setMethod(k)} className={`py-3 rounded-xl font-bold ${method === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}</div>
            {method === "credit" && <div className="mt-3 space-y-2 text-right"><select value={cust} onChange={e => setCust(e.target.value)} className="w-full"><option value="">اختار العميل</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}</select>
              <div className="flex gap-2"><input placeholder="عميل جديد" value={nc.name} onChange={e => setNc({ ...nc, name: e.target.value })} /><input placeholder="موبايل" value={nc.phone} onChange={e => setNc({ ...nc, phone: e.target.value })} /><button onClick={addCust} className={btn}>+</button></div></div>}
            <button disabled={busy} onClick={pay} className={btn + " w-full mt-4 py-4 text-lg"}>تأكيد الدفع</button>
            {!st?.claimed_at && <button onClick={cancel} className="mt-3 text-sm underline text-roast">إلغاء الفاتورة</button>}
          </div> : <div>
            <h2 className="font-black">الفاتورة</h2>
            {lines.length === 0 ? <p className="mt-3 text-sm text-roast">اضغط على الأصناف عشان تضيفها.</p> : <ul className="mt-2 divide-y divide-sand">{lines.map(i => (
              <li key={i.id} className="py-2.5 flex items-center gap-2"><span className="flex-1 text-sm font-bold">{i.name}</span>
                <div className="flex items-center gap-2" dir="ltr"><button onClick={() => bump(i.id, -1)} className="w-8 h-8 border border-espresso">−</button><span className="w-5 text-center num">{cart[i.id]}</span><button onClick={() => bump(i.id, 1)} className="w-8 h-8 bg-espresso text-cream">+</button></div>
                <span className="w-16 text-left num text-sm">{M(i.price * cart[i.id])}</span></li>))}</ul>}
            <p className="mt-3 text-3xl font-black num">{M(total)} <span className="text-base">ج</span></p><p className="text-xs text-roast num">العميل يجمع {ar(pts)} نقطة</p>
            <div className="mt-3 flex items-center gap-2 text-sm"><span>مدة الكود:</span>{[1, 2, 5, 10].map(m => <button key={m} onClick={() => setMins(m)} className={`px-3 py-1.5 rounded-full border ${mins === m ? "bg-espresso text-cream border-espresso" : "border-roast/30"}`}>{ar(m)} د</button>)}</div>
            <button disabled={!lines.length || busy} onClick={create} className={btn + " w-full mt-4 py-4 text-lg"}>اعمل الفاتورة (QR)</button>
            {lines.length > 0 && <button onClick={() => setCart({})} className="mt-2 text-sm underline text-roast">فضّي الفاتورة</button>}
          </div>}
        </aside>
      </div>
      {closing && <div className="fixed inset-0 z-50 bg-espresso/70 grid place-items-center p-6" role="dialog" aria-modal><form onSubmit={closeShift} className="bg-white p-6 w-full max-w-sm space-y-4 rounded-3xl">
        <h2 className="text-xl font-black">قفل الشيفت</h2><label className="block text-sm font-bold">عدّ الكاش اللي في الدُرج واكتب المبلغ (ج)<input type="number" min={0} className="mt-1.5 w-full" value={counted} onChange={e => setCounted(e.target.value)} /></label>
        <div className="flex gap-3"><button disabled={busy} className={btn + " flex-1"}>قفل</button><button type="button" onClick={() => setClosing(false)} className="flex-1 border border-espresso py-2.5">إلغاء</button></div></form></div>}
    </main>);
}
export default function Page() { return <Gate need="staff">{me => <Pos me={me} />}</Gate>; }

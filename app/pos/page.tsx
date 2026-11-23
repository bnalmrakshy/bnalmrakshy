"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import Gate, { Me } from "@/components/Gate";
import { btn } from "@/components/ui";
import { sb, ar } from "@/lib/supabase";
import { METHOD, M } from "@/lib/erp";
type It = { id: number; category: string; name: string; price: number; points: number; stock: number; low: boolean };
let syncing = false;
type Inv = { id: string; token: string; total: number; points: number; expires_at: string };
const ERR: Record<string, string> = { "no open shift": "افتح الشيفت الأول.", "invoice not open": "الفاتورة دي اتقفلت قبل كده.", "customer required": "اختار العميل للبيع الآجل.", forbidden: "مش مسموح.",
  "claimed invoice pending": "فيه فاتورة العميل مسحها وماتدفعتش. ادفعها الأول.", "Failed to fetch": "مفيش اتصال بالإنترنت.", "bad item": "فيه صنف مش صالح." };
const why = (m: string) => ERR[Object.keys(ERR).find(k => m.includes(k)) ?? ""] ?? "حصلت مشكلة: " + m;
function Pos({ me }: { me: Me }) {
  const [shift, setShift] = useState<any>(undefined); const [items, setItems] = useState<It[]>([]); const [cart, setCart] = useState<Record<number, number>>({});
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [inv, setInv] = useState<Inv | null>(null); const [st, setSt] = useState<any>(null); const [left, setLeft] = useState(0);
  const [mins, setMins] = useState(2); const [method, setMethod] = useState("cash"); const [custs, setCusts] = useState<any[]>([]); const [cust, setCust] = useState(""); const [nc, setNc] = useState({ name: "", phone: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [openCash, setOpenCash] = useState(""); const [closing, setClosing] = useState(false); const [counted, setCounted] = useState("");
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]); const [branch, setBranch] = useState(""); const [online, setOnline] = useState(true); const [queue, setQueue] = useState<any[]>([]); const [stats, setStats] = useState({ n: 0, sum: 0 }); const [summary, setSummary] = useState<any>(null);
  useEffect(() => { const f = () => setOnline(navigator.onLine); f(); window.addEventListener("online", f); window.addEventListener("offline", f); return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); }; }, []);
  const loadStats = useCallback(async (sid: number) => { const r = await sb.from("invoices").select("paid_amount").eq("shift_id", sid).eq("status", "paid"); const rows = r.data ?? []; setStats({ n: rows.length, sum: rows.reduce((a: number, x: any) => a + x.paid_amount, 0) }); }, []);
  const loadShift = useCallback(async () => {
    const r = await sb.from("shifts").select("*").eq("cashier_id", me.id).is("closed_at", null).maybeSingle();
    if (r.error) { setMsg("مشكلة في قراءة الشيفت: " + r.error.message); setShift(null); return; }
    setShift(r.data ?? null);
    if (r.data) {
      loadStats(r.data.id);
      const iv = await sb.from("invoices").select("id,token,total,points,expires_at").eq("created_by", me.id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (iv.data) setInv(cur => cur ?? (iv.data as Inv));
    }
  }, [me.id, loadStats]);
  const loadCusts = useCallback(async () => { const r = await sb.from("customers").select("id,name,phone").order("name"); if (r.error) setMsg("تعذّر تحميل العملاء: " + r.error.message); setCusts(r.data ?? []); }, []);
  useEffect(() => { loadShift(); loadCusts(); sb.from("branches").select("id,name").eq("active", true).order("id").then(r => { setBranches(r.data ?? []); if (r.data?.length === 1) setBranch(String(r.data[0].id)); }); sb.rpc("pos_items").then(r => { if (r.error) { setMsg("تعذّر تحميل الأصناف، بنستخدم النسخة المحفوظة."); try { setItems(JSON.parse(localStorage.getItem("pos_items") ?? "[]")); } catch { /* ignore */ } } else { setItems(r.data ?? []); try { localStorage.setItem("pos_items", JSON.stringify(r.data ?? [])); } catch { /* ignore */ } } }); }, [loadShift, loadCusts]);
  useEffect(() => { if (!inv) return; const t = setInterval(async () => { const r = await sb.from("invoices").select("claimed_at,discount,total,points_earned,status,claimer:claimed_by(display_name)").eq("id", inv.id).single(); if (r.data) setSt(r.data); }, 2500); return () => clearInterval(t); }, [inv]);
  useEffect(() => { if (!inv) return; const t = setInterval(() => setLeft(Math.max(0, Math.round((+new Date(inv.expires_at) - Date.now()) / 1000))), 500); return () => clearInterval(t); }, [inv]);
  const lines = items.filter(i => (cart[i.id] ?? 0) > 0); const total = lines.reduce((a, i) => a + i.price * cart[i.id], 0); const pts = lines.reduce((a, i) => a + i.points * cart[i.id], 0);
  const cats = Array.from(new Set(items.map(i => i.category))); const shown = items.filter(i => (!cat || i.category === cat) && (!q || i.name.includes(q)));
  const bump = (id: number, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(100, (c[id] ?? 0) + d)) }));
  const due = inv ? inv.total - (st?.discount ?? 0) : 0; const off = !online || busy;
  useEffect(() => { try { setQueue(JSON.parse(localStorage.getItem("pos_queue") ?? "[]")); } catch { /* ignore */ } navigator.serviceWorker?.register("/pos-sw.js", { scope: "/pos" }).catch(() => {}); }, []);
  useEffect(() => {
    if (!online || queue.length === 0 || !shift) return;
    const t = setTimeout(async () => {
      if (syncing) return; syncing = true; const left: any[] = [];
      for (const s of queue) { const r = await sb.rpc("record_offline_sale", { p_client: s.id, p_lines: s.lines, p_method: s.method, p_paid_at: s.at }); if (r.error) left.push(s); }
      syncing = false;
      if (left.length !== queue.length) { try { localStorage.setItem("pos_queue", JSON.stringify(left)); } catch { /* ignore */ } setQueue(left); loadStats(shift.id); }
    }, 1500);
    return () => clearTimeout(t);
  }, [online, queue, shift, loadStats]);
  function saveOffline() {
    const s = { id: crypto.randomUUID(), lines: lines.map(i => ({ id: i.id, qty: cart[i.id] })), method: "cash", at: new Date().toISOString() }; const n = [...queue, s];
    try { localStorage.setItem("pos_queue", JSON.stringify(n)); } catch { /* ignore */ } setQueue(n); setCart({}); setMsg(`اتحفظ البيع أوفلاين (${M(total)} ج) وهيتبعت أول ما النت يرجع.`);
  }
  async function openShift(e: React.FormEvent) { e.preventDefault(); if (branches.length > 1 && !branch) return setMsg("اختار الفرع."); setBusy(true); const r = await sb.rpc("open_shift", { opening: +openCash || 0, p_branch: branch ? +branch : null }); setBusy(false); if (r.error) return setMsg(why(r.error.message)); setMsg(""); setSummary(null); await loadShift(); }
  async function closeShift(e: React.FormEvent) { e.preventDefault(); setBusy(true); const r = await sb.rpc("close_shift", { counted: +counted || 0 }); setBusy(false); if (r.error) return setMsg(why(r.error.message)); setClosing(false); setShift(null); setInv(null); setCart({}); setSummary(r.data); setMsg(""); }
  async function create() {
    setBusy(true); setMsg(""); const r = await sb.rpc("create_invoice", { lines: lines.map(i => ({ id: i.id, qty: cart[i.id] })), mins }); setBusy(false);
    if (r.error) return setMsg(why(r.error.message)); setInv(r.data); setSt(null); setMethod("cash"); setCust("");
  }
  async function pay() {
    if (!inv) return; setBusy(true); const r = await sb.rpc("pay_invoice", { inv_id: inv.id, method, cust: method === "credit" && cust ? +cust : null }); setBusy(false);
    if (r.error) return setMsg(why(r.error.message)); setMsg(`تم الدفع: ${M(r.data.paid)} ج (${METHOD[method]})`); setInv(null); setSt(null); setCart({}); if (shift) loadStats(shift.id);
  }
  async function cancel() { if (!inv) return; const r = await sb.rpc("cancel_invoice", { inv_id: inv.id }); if (r.error) return setMsg(why(r.error.message)); setInv(null); setSt(null); setMsg("اتلغت الفاتورة."); }
  async function addCust() { if (!nc.name.trim()) return; const r = await sb.rpc("add_customer", { p_name: nc.name, p_phone: nc.phone || null }); if (r.error) return setMsg(why(r.error.message)); setNc({ name: "", phone: "" }); await loadCusts(); setCust(String(r.data)); }
  const chip = (a: boolean) => `shrink-0 px-4 py-2 rounded-full text-sm font-bold ${a ? "bg-espresso text-cream" : "bg-sand text-roast"}`;
  const banner = !online && <p role="alert" className="mb-3 rounded-xl bg-caramel text-white px-4 py-3 text-sm font-bold">مفيش اتصال بالإنترنت. تقدر تسجّل بيع كاش أوفلاين وهيتبعت لما النت يرجع.</p>;
  if (shift === undefined) return <main className="min-h-[60vh] grid place-items-center text-roast">لحظة...</main>;
  if (!shift) return (
    <main className="mx-auto max-w-md px-5 pt-8"><h1 className="text-3xl font-black">الكاشير</h1>{banner}
      {summary && <div className="mt-4 rounded-3xl bg-espresso text-cream p-5"><p className="font-black text-lg">اتقفل الشيفت</p><p className="text-sm text-cream/70 mt-1 num">{M(summary.count)} فاتورة</p>
        {(summary.by_method ?? []).map((x: any) => <p key={x.method} className="flex justify-between text-sm mt-2"><span>{METHOD[x.method] ?? x.method} ({M(x.n)})</span><b className="num">{M(x.amount)} ج</b></p>)}
        <p className="mt-3 pt-3 border-t border-white/20 flex justify-between text-sm"><span>الفرق في الكاش</span><b className="num">{M(summary.diff)} ج</b></p></div>}
      <p className="text-roast mt-4">افتح الشيفت بتاعك عشان تبدأ تبيع.</p>
      <form onSubmit={openShift} className="mt-4 rounded-3xl bg-sand/60 p-5 space-y-4"><label className="block text-sm font-bold">الكاش اللي في الدُرج دلوقتي (ج)<input type="number" min={0} className="mt-1.5 w-full" value={openCash} onChange={e => setOpenCash(e.target.value)} /></label>
        {branches.length > 1 && <label className="block text-sm font-bold">الفرع<select className="mt-1.5 w-full" value={branch} onChange={e => setBranch(e.target.value)}><option value="">اختار الفرع</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
        <button disabled={off} className={btn + " w-full py-3.5"}>{busy ? "لحظة..." : "افتح الشيفت"}</button></form>
      {msg && <p role="status" className="mt-4 text-caramel font-bold break-words">{msg}</p>}</main>);
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-4">
      {banner}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><p className="font-black">شيفت #{ar(shift.id)} · {me.display_name} <span className="text-xs text-roast font-normal">من {new Date(shift.opened_at).toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" })}</span></p>
        <div className="flex items-center gap-4"><span className="rounded-full bg-sand px-3 py-1.5 text-xs font-bold num">{M(stats.n)} فاتورة · {M(stats.sum)} ج</span>{queue.length > 0 && <span className="rounded-full bg-caramel text-white px-3 py-1.5 text-xs font-bold num">{M(queue.length)} مستني مزامنة</span>}<Link href="/delivery" className="text-sm underline font-bold">التوصيل</Link><button onClick={() => setClosing(true)} className="text-sm underline font-bold">قفل الشيفت</button></div></div>
      {msg && <p role="status" className="mb-3 rounded-xl bg-espresso text-cream px-4 py-3 text-sm font-bold break-words">{msg}</p>}
      <div className="lg:grid lg:grid-cols-[1fr_24rem] lg:gap-6 lg:items-start">
        <section>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر على صنف" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3"><button onClick={() => setCat("")} className={chip(!cat)}>الكل</button>{cats.map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}</div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">{shown.map(i => (
            <button key={i.id} disabled={!!inv} onClick={() => bump(i.id, 1)} className="relative rounded-2xl bg-sand/60 p-3 text-right min-h-[84px] active:scale-95 transition disabled:opacity-40">
              <span className="block font-bold text-sm leading-5">{i.name}</span><span className="block mt-1 font-black num">{M(i.price)} ج</span>{i.low && <span className="block text-[10px] font-bold text-caramel mt-0.5">قرب يخلص ({M(i.stock)})</span>}
              {(cart[i.id] ?? 0) > 0 && <span className="absolute top-2 left-2 min-w-6 h-6 px-1 rounded-full bg-espresso text-cream text-xs font-black grid place-items-center num">{ar(cart[i.id])}</span>}</button>))}</div>
          {items.length === 0 && <p className="mt-6 text-roast">مفيش أصناف. أضفها من المكتب.</p>}
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
            <button disabled={off} onClick={pay} className={btn + " w-full mt-4 py-4 text-lg"}>{busy ? "لحظة..." : "تأكيد الدفع"}</button>
            {!st?.claimed_at && <button onClick={cancel} disabled={off} className="mt-3 text-sm underline text-roast">إلغاء الفاتورة</button>}
          </div> : <div>
            <h2 className="font-black">الفاتورة</h2>
            {lines.length === 0 ? <p className="mt-3 text-sm text-roast">اضغط على الأصناف عشان تضيفها.</p> : <ul className="mt-2 divide-y divide-sand">{lines.map(i => (
              <li key={i.id} className="py-2.5 flex items-center gap-2"><span className="flex-1 text-sm font-bold">{i.name}</span>
                <div className="flex items-center gap-2" dir="ltr"><button onClick={() => bump(i.id, -1)} className="w-8 h-8 border border-espresso">−</button><span className="w-5 text-center num">{cart[i.id]}</span><button onClick={() => bump(i.id, 1)} className="w-8 h-8 bg-espresso text-cream">+</button></div>
                <span className="w-16 text-left num text-sm">{M(i.price * cart[i.id])}</span></li>))}</ul>}
            <p className="mt-3 text-3xl font-black num">{M(total)} <span className="text-base">ج</span></p><p className="text-xs text-roast num">العميل يجمع {ar(pts)} نقطة</p>
            <div className="mt-3 flex items-center gap-2 text-sm"><span>مدة الكود:</span>{[1, 2, 5, 10].map(m => <button key={m} onClick={() => setMins(m)} className={`px-3 py-1.5 rounded-full border ${mins === m ? "bg-espresso text-cream border-espresso" : "border-roast/30"}`}>{ar(m)} د</button>)}</div>
            <button disabled={!lines.length || off} onClick={create} className={btn + " w-full mt-4 py-4 text-lg"}>{busy ? "لحظة..." : "اعمل الفاتورة (QR)"}</button>
            {!online && <button disabled={!lines.length} onClick={saveOffline} className={btn + " w-full mt-2 py-3"}>سجّل بيع كاش (أوفلاين)</button>}
            {lines.length > 0 && <button onClick={() => setCart({})} className="mt-2 text-sm underline text-roast">فضّي الفاتورة</button>}
          </div>}
        </aside>
      </div>
      {closing && <div className="fixed inset-0 z-50 bg-espresso/70 grid place-items-center p-6" role="dialog" aria-modal><form onSubmit={closeShift} className="bg-white p-6 w-full max-w-sm space-y-4 rounded-3xl">
        <h2 className="text-xl font-black">قفل الشيفت</h2>{inv && <p className="text-xs text-roast">فيه فاتورة مفتوحة، هتتلغي لو محدش مسحها.</p>}<label className="block text-sm font-bold">عدّ الكاش اللي في الدُرج واكتب المبلغ (ج)<input type="number" min={0} className="mt-1.5 w-full" value={counted} onChange={e => setCounted(e.target.value)} /></label>
        {msg && <p className="text-caramel text-sm font-bold">{msg}</p>}<div className="flex gap-3"><button disabled={off} className={btn + " flex-1"}>قفل</button><button type="button" onClick={() => { setClosing(false); setMsg(""); }} className="flex-1 border border-espresso py-2.5">إلغاء</button></div></form></div>}
    </main>);
}
export default function Page() { return <Gate need="staff">{me => <Pos me={me} />}</Gate>; }

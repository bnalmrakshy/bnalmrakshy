"use client";
import { useCallback, useEffect, useState } from "react";
import { btn, card, useData } from "@/components/ui";
import { sb, cairoToday } from "@/lib/supabase";
import { METHOD, M, addDays, exportReport } from "@/lib/erp";
const Msg = ({ t }: { t: string }) => (t ? <p role="status" className="mt-3 text-caramel font-bold text-sm">{t}</p> : null);
const T = (t: string) => new Date(t).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short", timeStyle: "short" });

export function ItemsPanel() {
  const [items, reload, err] = useData(() => sb.rpc("admin_items"), []);
  const [q, setQ] = useState(""); const [msg, setMsg] = useState(""); const [edit, setEdit] = useState<Record<number, any>>({}); const [nw, setNw] = useState({ category: "", name: "", price: "", points: "" });
  const val = (i: any, k: string) => edit[i.id]?.[k] ?? i[k]; const set = (i: any, k: string, v: any) => setEdit(e => ({ ...e, [i.id]: { ...e[i.id], [k]: v } }));
  async function save(i: any) {
    const a = await sb.rpc("admin_save_item", { iid: i.id, newprice: +val(i, "price"), newpoints: +val(i, "points"), newcost: +val(i, "cost"), isactive: val(i, "active"), newmin: +val(i, "min_stock") });
    if (a.error) return setMsg("تعذّر الحفظ (راجع الأرقام).");
    if (+val(i, "stock") !== i.stock) { const b = await sb.rpc("adjust_stock", { p_item: i.id, p_qty: +val(i, "stock"), p_note: "تسوية يدوية" }); if (b.error) return setMsg("تعذّرت تسوية المخزون."); }
    setMsg("اتحفظ: " + i.name); setEdit(e => { const n = { ...e }; delete n[i.id]; return n; }); reload();
  }
  async function add(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("admin_add_item", { cat: nw.category, nm: nw.name, pr: +nw.price, pts: +nw.points }); if (r.error) return setMsg("تعذّرت الإضافة."); setNw({ category: "", name: "", price: "", points: "" }); setMsg("اتضاف. كمّل تكلفته ومخزونه من القايمة."); reload(); }
  return (
    <section>
      <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end"><input placeholder="القسم" value={nw.category} onChange={e => setNw({ ...nw, category: e.target.value })} /><input placeholder="الاسم" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} />
        <input type="number" placeholder="السعر" value={nw.price} onChange={e => setNw({ ...nw, price: e.target.value })} /><input type="number" placeholder="نقاطه" value={nw.points} onChange={e => setNw({ ...nw, points: e.target.value })} /><button className={btn}>إضافة صنف</button></form>
      <Msg t={msg || err} /><input className="mt-4 w-full" placeholder="دوّر في الأصناف" value={q} onChange={e => setQ(e.target.value)} />
      <ul className="mt-3 space-y-2">{(items as any[]).filter(i => !q || i.name.includes(q) || i.category.includes(q)).map(i => (
        <li key={i.id} className={card + (val(i, "active") ? "" : " opacity-50")}>
          <div className="flex items-center justify-between"><p className="font-bold">{i.name} <span className="text-xs text-roast font-normal">{i.category}</span></p>{(i.stock < 0 || (i.min_stock > 0 && i.stock <= i.min_stock)) && <span className="text-xs font-bold text-caramel">المخزون واطي</span>}</div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            {[["price", "سعر البيع"], ["cost", "التكلفة"], ["points", "النقاط"], ["stock", "المخزون"], ["min_stock", "حد التنبيه"]].map(([k, l]) => <label key={k}>{l}<input type="number" className="mt-1 w-full" value={val(i, k)} onChange={e => set(i, k, e.target.value)} /></label>)}
            <div className="flex items-end gap-3"><label className="flex items-center gap-1 pb-3"><input type="checkbox" checked={val(i, "active")} onChange={e => set(i, "active", e.target.checked)} />ظاهر</label><button onClick={() => save(i)} className={btn + " mb-1"}>حفظ</button></div></div>
        </li>))}</ul>
    </section>);
}

export function PurchasesPanel() {
  const [sup] = useData(() => sb.from("suppliers").select("id,name").order("name"), []); const [items] = useData(() => sb.rpc("admin_items"), []);
  const [accts] = useData(() => sb.from("accounts").select("id,name").order("id"), []);
  const [rec, reload] = useData(() => sb.from("purchases").select("id,kind,total,paid,created_at,suppliers(name)").order("id", { ascending: false }).limit(30), []);
  const [f, setF] = useState({ kind: "purchase", supplier: "", paid: "", acct: "", note: "" }); const [lines, setLines] = useState<{ id: number; name: string; qty: number; cost: number }[]>([]); const [q, setQ] = useState(""); const [msg, setMsg] = useState("");
  const total = lines.reduce((a, l) => a + l.qty * l.cost, 0); const hits = q ? (items as any[]).filter(i => i.name.includes(q)).slice(0, 6) : [];
  const upd = (id: number, k: "qty" | "cost", v: number) => setLines(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l));
  async function submit() {
    const r = await sb.rpc("create_purchase", { p_kind: f.kind, p_supplier: +f.supplier, p_lines: lines.map(l => ({ id: l.id, qty: l.qty, cost: l.cost })), p_paid: +f.paid || 0, p_acct: f.acct ? +f.acct : null, p_note: f.note || null });
    if (r.error) return setMsg("تعذّر الحفظ: " + (r.error.message.includes("supplier") ? "اختار المورد." : r.error.message.includes("payment") ? "اختار الحساب لو في مبلغ مدفوع." : r.error.message));
    setMsg(f.kind === "purchase" ? "اتسجلت فاتورة المشتريات وزاد المخزون." : "اتسجل المرتجع ونقص المخزون."); setLines([]); setF({ ...f, paid: "", note: "" }); reload();
  }
  return (
    <section>
      <div className="flex gap-2">{[["purchase", "فاتورة مشتريات"], ["return", "مرتجع مشتريات"]].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, kind: k })} className={`flex-1 py-2.5 rounded-xl font-bold ${f.kind === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}</div>
      <div className="mt-3 grid md:grid-cols-2 gap-2"><select value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })}><option value="">اختار المورد</option>{(sup as any[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input placeholder="ملاحظة" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
      <input className="mt-3 w-full" placeholder="ضيف صنف: اكتب جزء من الاسم" value={q} onChange={e => setQ(e.target.value)} />
      {hits.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{hits.map((i: any) => <button key={i.id} onClick={() => { setLines(ls => ls.some(l => l.id === i.id) ? ls : [...ls, { id: i.id, name: i.name, qty: 1, cost: Number(i.cost) }]); setQ(""); }} className="px-3 py-2 rounded-xl bg-sand text-sm font-bold">+ {i.name}</button>)}</div>}
      <ul className="mt-3 space-y-2">{lines.map(l => <li key={l.id} className={card + " flex flex-wrap items-center gap-2"}><span className="flex-1 min-w-[8rem] font-bold text-sm">{l.name}</span>
        <label className="text-xs">الكمية<input type="number" min={1} className="w-20 block" value={l.qty} onChange={e => upd(l.id, "qty", +e.target.value)} /></label>
        <label className="text-xs">سعر الوحدة<input type="number" min={0} className="w-24 block" value={l.cost} onChange={e => upd(l.id, "cost", +e.target.value)} /></label>
        <button onClick={() => setLines(ls => ls.filter(x => x.id !== l.id))} className="underline text-caramel text-sm">شيل</button></li>)}</ul>
      <div className="mt-3 grid md:grid-cols-3 gap-2 items-end"><p className="font-black text-2xl num">{M(total)} ج</p>
        <label className="text-xs">المدفوع دلوقتي<input type="number" min={0} className="block w-full" value={f.paid} onChange={e => setF({ ...f, paid: e.target.value })} /></label>
        <select value={f.acct} onChange={e => setF({ ...f, acct: e.target.value })}><option value="">من أي حساب؟</option>{(accts as any[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <p className="text-xs text-roast mt-2">اللي مش مدفوع بيتسجل على المورد كمستحق.</p>
      <button disabled={!lines.length} onClick={submit} className={btn + " w-full mt-3 py-3.5"}>سجّل</button><Msg t={msg} />
      <h3 className="mt-8 font-black">آخر العمليات</h3><ul className="mt-2 space-y-2">{(rec as any[]).map(p => <li key={p.id} className={card + " flex justify-between text-sm"}><span>{p.kind === "purchase" ? "مشتريات" : "مرتجع"} · {p.suppliers?.name}</span><span className="num">{M(p.total)} ج · {T(p.created_at)}</span></li>)}</ul>
    </section>);
}

export function PartiesPanel() {
  const [tab, setTab] = useState<"customers" | "suppliers">("customers"); const [rows, reload] = useData(() => sb.from(tab).select("id,name,phone,balance").order("name"), []);
  const [nw, setNw] = useState({ name: "", phone: "" }); const [msg, setMsg] = useState("");
  useEffect(() => { reload(); }, [tab, reload]);
  async function add(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc(tab === "customers" ? "add_customer" : "add_supplier", { p_name: nw.name, p_phone: nw.phone || null }); if (r.error) return setMsg("تعذّرت الإضافة."); setNw({ name: "", phone: "" }); setMsg("اتضاف."); reload(); }
  return (
    <section>
      <div className="flex gap-2">{[["customers", "العملاء"], ["suppliers", "الموردين"]].map(([k, l]) => <button key={k} onClick={() => setTab(k as any)} className={`flex-1 py-2.5 rounded-xl font-bold ${tab === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}</div>
      <form onSubmit={add} className="mt-3 grid grid-cols-3 gap-2"><input placeholder="الاسم" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} /><input placeholder="الموبايل" value={nw.phone} onChange={e => setNw({ ...nw, phone: e.target.value })} /><button className={btn}>إضافة</button></form><Msg t={msg} />
      <ul className="mt-4 space-y-2">{(rows as any[]).length === 0 ? <p className="text-roast">لسه مفيش.</p> : (rows as any[]).map(r => <li key={r.id} className={card + " flex justify-between items-center"}><span><b>{r.name}</b> <span className="text-xs text-roast">{r.phone}</span></span>
        <span className={`font-black num ${Number(r.balance) !== 0 ? "text-caramel" : ""}`}>{tab === "customers" ? "عليه" : "له"} {M(r.balance)} ج</span></li>)}</ul>
    </section>);
}

export function TreasuryPanel() {
  const [bal, reloadBal] = useData(() => sb.rpc("treasury_balances"), []); const [tx, reloadTx] = useData(() => sb.from("treasury_tx").select("amount,kind,note,created_at,accounts(name)").order("id", { ascending: false }).limit(40), []);
  const [cus] = useData(() => sb.from("customers").select("id,name").order("name"), []); const [sup] = useData(() => sb.from("suppliers").select("id,name").order("name"), []);
  const [f, setF] = useState({ kind: "in", acct: "", amount: "", ptype: "other", pid: "", note: "" }); const [na, setNa] = useState({ name: "", kind: "bank" }); const [msg, setMsg] = useState("");
  const refresh = () => { reloadBal(); reloadTx(); };
  async function voucher() {
    const r = await sb.rpc("create_voucher", { p_kind: f.kind, p_acct: +f.acct, p_amount: +f.amount, p_ptype: f.ptype, p_pid: f.pid ? +f.pid : null, p_note: f.note || null });
    if (r.error) return setMsg("تعذّر السند: راجع الحساب والمبلغ والطرف."); setMsg("اتسجل السند."); setF({ ...f, amount: "", note: "" }); refresh();
  }
  async function addAcc() { const r = await sb.rpc("account_add", { p_name: na.name, p_kind: na.kind }); if (r.error) return setMsg("تعذّرت إضافة الحساب."); setNa({ name: "", kind: "bank" }); refresh(); }
  const parties = f.ptype === "customer" ? cus : f.ptype === "supplier" ? sup : [];
  return (
    <section>
      <div className="grid sm:grid-cols-3 gap-3">{(bal as any[]).map(a => <div key={a.id} className="rounded-2xl bg-espresso text-cream p-4"><p className="text-xs text-cream/60">{a.name}</p><p className="text-2xl font-black num">{M(a.balance)} ج</p></div>)}</div>
      <div className="mt-2 flex gap-2"><input placeholder="حساب جديد (بنك/محفظة)" value={na.name} onChange={e => setNa({ ...na, name: e.target.value })} /><select value={na.kind} onChange={e => setNa({ ...na, kind: e.target.value })}><option value="bank">بنك</option><option value="wallet">محفظة</option><option value="cash">كاش</option></select><button onClick={addAcc} className={btn}>+</button></div>
      <h3 className="mt-8 font-black">سند جديد</h3>
      <div className="mt-2 flex gap-2">{[["in", "سند قبض"], ["out", "سند صرف"]].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, kind: k })} className={`flex-1 py-2.5 rounded-xl font-bold ${f.kind === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}</div>
      <div className="mt-2 grid md:grid-cols-4 gap-2"><select value={f.acct} onChange={e => setF({ ...f, acct: e.target.value })}><option value="">الحساب</option>{(bal as any[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <input type="number" min={0} placeholder="المبلغ" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        <select value={f.ptype} onChange={e => setF({ ...f, ptype: e.target.value, pid: "" })}><option value="other">أخرى (مصروفات/إيراد)</option><option value="customer">عميل</option><option value="supplier">مورد</option></select>
        {f.ptype !== "other" ? <select value={f.pid} onChange={e => setF({ ...f, pid: e.target.value })}><option value="">اختار</option>{(parties as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : <input placeholder="البيان" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />}</div>
      <button disabled={!f.acct || !f.amount} onClick={voucher} className={btn + " w-full mt-2 py-3"}>سجّل السند</button><Msg t={msg} />
      <h3 className="mt-8 font-black">آخر الحركات</h3><ul className="mt-2 space-y-2">{(tx as any[]).map((t, k) => <li key={k} className={card + " flex justify-between text-sm"}><span>{t.accounts?.name} · {t.kind}{t.note ? ` · ${t.note}` : ""}</span><span className={`num font-black ${t.amount < 0 ? "text-caramel" : ""}`}>{M(t.amount)} · <span className="text-roast font-normal">{T(t.created_at)}</span></span></li>)}</ul>
    </section>);
}

export function ReportsPanel() {
  const today = cairoToday(); const [from, setFrom] = useState(today); const [to, setTo] = useState(today); const [shift, setShift] = useState(""); const [d, setD] = useState<any>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [shifts] = useData(() => sb.from("shifts").select("id,cashier_name,opened_at").order("id", { ascending: false }).limit(80), []);
  const run = useCallback(async () => { setBusy(true); setMsg(""); const r = await sb.rpc("report_data", { d_from: from, d_to: to, p_shift: shift ? +shift : null }); setBusy(false); if (r.error) return setMsg("تعذّر تحميل التقرير: " + r.error.message); setD(r.data); }, [from, to, shift]);
  useEffect(() => { run(); }, [run]);
  const preset = (a: string, b: string) => { setFrom(a); setTo(b); };
  const s = d?.summary; const mx = d ? Math.max(1, ...d.by_method.map((x: any) => Number(x.amount))) : 1;
  const shiftLabel = shift ? (shifts as any[]).find(x => String(x.id) === shift)?.cashier_name + " #" + shift : "كل الشيفتات";
  return (
    <section>
      <div className="flex flex-wrap gap-2 text-sm">{[["النهارده", today, today], ["امبارح", addDays(today, -1), addDays(today, -1)], ["آخر ٧ أيام", addDays(today, -6), today], ["الشهر ده", today.slice(0, 8) + "01", today]].map(([l, a, b]) => <button key={l} onClick={() => preset(a, b)} className="px-3 py-2 rounded-full bg-sand font-bold">{l}</button>)}</div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end"><label className="text-xs">من<input type="date" className="block w-full" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="text-xs">إلى<input type="date" className="block w-full" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label className="text-xs col-span-2 md:col-span-1">الشيفت<select className="block w-full" value={shift} onChange={e => setShift(e.target.value)}><option value="">كل الشيفتات</option>{(shifts as any[]).map(x => <option key={x.id} value={x.id}>#{x.id} · {x.cashier_name} · {T(x.opened_at)}</option>)}</select></label>
        <button disabled={!d || busy} onClick={() => exportReport(d, from, to, shiftLabel)} className={btn + " col-span-2 md:col-span-1"}>تحميل Excel</button></div>
      <Msg t={msg} />{busy && !d && <p className="mt-4 text-roast">بنحمّل...</p>}
      {d && <>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">{[["المبيعات (بعد الخصم)", s.sales], ["عدد الفواتير", s.count, 1], ["متوسط الفاتورة", s.count ? s.sales / s.count : 0], ["خصم النقاط", s.discount], ["التكلفة", s.cost], ["الربح التقديري", s.sales - s.cost]].map(([l, v, n]) =>
          <div key={l as string} className="rounded-2xl bg-espresso text-cream p-4"><p className="text-xs text-cream/60">{l}</p><p className="text-2xl font-black num">{M(v)}{n ? "" : " ج"}</p></div>)}</div>
        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          <div className={card}><h3 className="font-black">طرق الدفع</h3>{d.by_method.length === 0 ? <p className="text-sm text-roast mt-2">لا بيانات.</p> : d.by_method.map((x: any) => <div key={x.method} className="mt-3"><div className="flex justify-between text-sm"><span>{METHOD[x.method] ?? x.method} ({M(x.n)})</span><b className="num">{M(x.amount)} ج</b></div><div className="h-2 rounded-full bg-white mt-1"><div className="h-full rounded-full bg-brass" style={{ width: `${(Number(x.amount) / mx) * 100}%` }} /></div></div>)}</div>
          <div className={card}><h3 className="font-black">الكاشير</h3>{d.by_cashier.length === 0 ? <p className="text-sm text-roast mt-2">لا بيانات.</p> : d.by_cashier.map((x: any) => <div key={x.cashier} className="mt-2 flex justify-between text-sm"><span>{x.cashier} ({M(x.n)} فاتورة)</span><b className="num">{M(x.amount)} ج</b></div>)}</div>
          <div className={card}><h3 className="font-black">أكتر الأصناف مبيعًا</h3>{d.items.slice(0, 10).map((x: any) => <div key={x.name} className="mt-2 flex justify-between text-sm"><span>{x.name} × {M(x.qty)}</span><b className="num">{M(x.revenue)} ج</b></div>)}{d.items.length === 0 && <p className="text-sm text-roast mt-2">لا بيانات.</p>}</div>
          <div className={card}><h3 className="font-black">الخزن والأرصدة</h3>{d.treasury.map((x: any) => <div key={x.name} className="mt-2 flex justify-between text-sm"><span>{x.name}</span><b className="num">{M(x.balance)} ج</b></div>)}
            <div className="mt-3 pt-3 border-t border-white text-sm space-y-1"><p className="flex justify-between"><span>مستحق على العملاء</span><b className="num">{M(d.balances.customers)} ج</b></p><p className="flex justify-between"><span>مستحق للموردين</span><b className="num">{M(d.balances.suppliers)} ج</b></p>
              <p className="flex justify-between"><span>قيمة المخزون</span><b className="num">{M(d.stock.reduce((a: number, x: any) => a + Number(x.value), 0))} ج</b></p></div></div>
          <div className={card}><h3 className="font-black">الشيفتات</h3>{d.shifts.length === 0 ? <p className="text-sm text-roast mt-2">مفيش شيفتات في الفترة.</p> : d.shifts.map((x: any) => <div key={x.id} className="mt-2 text-sm flex justify-between"><span>#{x.id} · {x.cashier_name}</span><span className={`num font-bold ${x.diff && Number(x.diff) !== 0 ? "text-caramel" : ""}`}>{x.closed_at ? `فرق ${M(x.diff)} ج` : "مفتوح"}</span></div>)}</div>
          <div className={card}><h3 className="font-black">أصناف خلصت</h3>{d.stock.filter((x: any) => x.stock <= 0).slice(0, 12).map((x: any, k: number) => <p key={k} className="mt-2 text-sm">{x.name} <span className="text-roast num">({M(x.stock)})</span></p>)}{d.stock.every((x: any) => x.stock > 0) && <p className="text-sm text-roast mt-2">مفيش.</p>}</div>
        </div></>}
    </section>);
}

export function SalesPanel() {
  const [rows, reload, err] = useData(() => sb.from("invoices").select("id,paid_at,total,discount,paid_amount,payment_method,status,shifts(cashier_name)").in("status", ["paid", "refunded"]).order("paid_at", { ascending: false }).limit(80), []);
  const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  async function refund(r: any) {
    if (!confirm(`استرجاع الفاتورة بـ ${M(r.paid_amount)} ج؟ هيرجع المخزون والفلوس ونقاط العميل.`)) return;
    const x = await sb.rpc("refund_invoice", { p_inv: r.id, p_reason: "استرجاع من المكتب" }); setMsg(x.error ? "تعذّر الاسترجاع: " + x.error.message : "اتسترجعت الفاتورة."); reload();
  }
  const list = (rows as any[]).filter(r => !q || String(r.id).startsWith(q) || (r.shifts?.cashier_name ?? "").includes(q));
  return (
    <section><input className="w-full" placeholder="دوّر برقم الفاتورة أو اسم الكاشير" value={q} onChange={e => setQ(e.target.value)} /><Msg t={msg || err} />
      <ul className="mt-3 space-y-2">{list.length === 0 ? <p className="text-roast">مفيش فواتير.</p> : list.map(r => (
        <li key={r.id} className={card + " flex flex-wrap items-center justify-between gap-2 " + (r.status === "refunded" ? "opacity-50" : "")}>
          <span className="text-sm"><b className="num">{String(r.id).slice(0, 8)}</b> · {r.shifts?.cashier_name ?? "—"} · {METHOD[r.payment_method] ?? r.payment_method}<span className="block text-xs text-roast num">{r.paid_at ? T(r.paid_at) : ""}</span></span>
          <span className="flex items-center gap-3"><b className="num">{M(r.paid_amount)} ج</b>{r.status === "refunded" ? <span className="text-xs font-bold text-caramel">مسترجعة</span> : <button onClick={() => refund(r)} className="text-sm underline text-caramel font-bold">استرجاع</button>}</span></li>))}</ul></section>);
}

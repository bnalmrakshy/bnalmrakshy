"use client";
import { useState } from "react";
import { btn, card, useData } from "@/components/ui";
import { sb, cairoToday } from "@/lib/supabase";
import { M } from "@/lib/erp";
const SRC: Record<string, string> = { sale: "مبيعات", refund: "استرجاع", purchase: "مشتريات", voucher: "سند", expense: "مصروف", count: "جرد", opening: "افتتاحي", manual: "يدوي", points: "نقاط ولاء" };
export default function Journal() {
  const [accs] = useData(() => sb.from("gl_accounts").select("code,name").eq("active", true).order("code"), []); const [list, reload] = useData(() => sb.rpc("list_journal", { lim: 60 }), []);
  const [set] = useData(() => sb.from("app_settings").select("accounting_locked_until").single(), null);
  const [f, setF] = useState({ date: cairoToday(), memo: "" }); const [lines, setLines] = useState([{ code: "", debit: "", credit: "" }, { code: "", debit: "", credit: "" }]); const [lock, setLock] = useState(""); const [msg, setMsg] = useState("");
  const d = lines.reduce((a, l) => a + (+l.debit || 0), 0), c = lines.reduce((a, l) => a + (+l.credit || 0), 0); const ok = d > 0 && Math.abs(d - c) < 0.005 && lines.every(l => !l.code === !(+l.debit || +l.credit));
  const upd = (i: number, k: string, v: string) => setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  async function post(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("post_manual_entry", { p_date: f.date, p_memo: f.memo, p_lines: lines.filter(l => l.code).map(l => ({ code: l.code, debit: +l.debit || 0, credit: +l.credit || 0 })) });
    if (r.error) return setMsg(r.error.message.includes("period locked") ? "الفترة دي مقفولة." : "تعذّر تسجيل القيد: " + r.error.message); setMsg("اتسجل القيد."); setLines([{ code: "", debit: "", credit: "" }, { code: "", debit: "", credit: "" }]); setF({ ...f, memo: "" }); reload(); }
  async function doLock(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("lock_period", { p_date: lock }); setMsg(r.error ? "تاريخ الإقفال لازم يكون قبل النهارده." : "اتقفلت الفترة."); }
  return (
    <section className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={post} className={card + " space-y-2"}><h3 className="font-black">قيد يومية يدوي</h3>
        <div className="grid grid-cols-2 gap-2"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /><input placeholder="البيان" value={f.memo} onChange={e => setF({ ...f, memo: e.target.value })} /></div>
        {lines.map((l, i) => <div key={i} className="grid grid-cols-[1fr_5rem_5rem] gap-2"><select value={l.code} onChange={e => upd(i, "code", e.target.value)}><option value="">الحساب</option>{(accs as any[]).map(a => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</select>
          <input type="number" min={0} placeholder="مدين" value={l.debit} onChange={e => upd(i, "debit", e.target.value)} /><input type="number" min={0} placeholder="دائن" value={l.credit} onChange={e => upd(i, "credit", e.target.value)} /></div>)}
        <div className="flex items-center justify-between text-sm"><button type="button" onClick={() => setLines(ls => [...ls, { code: "", debit: "", credit: "" }])} className="underline font-bold">+ سطر</button><span className={`num font-bold ${ok ? "" : "text-caramel"}`}>مدين {M(d)} · دائن {M(c)}</span></div>
        <button disabled={!ok} className={btn + " w-full"}>سجّل القيد</button></form>
      <div className="space-y-4"><form onSubmit={doLock} className={card}><h3 className="font-black">إقفال فترة محاسبية</h3><p className="text-sm text-roast mt-1">{set?.accounting_locked_until ? `مقفول حتى ${set.accounting_locked_until}.` : "مفيش فترة مقفولة."} بعد الإقفال مفيش قيود بتتسجل بتاريخ قبله.</p>
        <div className="mt-3 flex gap-2"><input type="date" value={lock} onChange={e => setLock(e.target.value)} /><button disabled={!lock} className={btn}>قفل</button></div></form>
        <div className={card}><h3 className="font-black mb-2">آخر القيود</h3><ul className="divide-y divide-sand text-sm">{(list as any[]).length === 0 ? <li className="text-roast">لا يوجد.</li> : (list as any[]).map(x => <li key={x.id} className="py-2 flex justify-between gap-3"><span>{x.entry_date} · {SRC[x.source] ?? x.source} · {x.memo}</span><b className="num">{M(x.amount)}</b></li>)}</ul></div></div>
      {msg && <p role="status" className="lg:col-span-2 text-caramel font-bold text-sm">{msg}</p>}</section>);
}

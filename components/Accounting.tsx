"use client";
import { useCallback, useEffect, useState } from "react";
import { btn, card, useData } from "@/components/ui";
import { sb, cairoToday } from "@/lib/supabase";
import { M, addDays } from "@/lib/erp";
import { useAdmin } from "@/components/admin/ctx";
type R = { code: string; name: string; type: string; p_debit: number; p_credit: number; c_debit: number; c_credit: number };
const TABS = [["pnl", "قائمة الدخل"], ["bs", "المركز المالي"], ["tb", "ميزان المراجعة"], ["exp", "المصروفات"], ["open", "أرصدة افتتاحية"]];
const Row = ({ l, v, b, i }: { l: string; v: number; b?: boolean; i?: boolean }) => <tr className={b ? "font-black border-t border-espresso" : ""}><td className={`py-2 ${i ? "pr-6" : ""}`}>{l}</td><td className="py-2 text-left num">{M(v)}</td></tr>;
export default function Accounting() {
  const today = cairoToday(); const [tab, setTab] = useState("pnl"); const [from, setFrom] = useState(today.slice(0, 8) + "01"); const [to, setTo] = useState(today); const { branch } = useAdmin(); const [rows, setRows] = useState<R[] | null>(null); const [msg, setMsg] = useState("");
  const [branches] = useData(() => sb.from("branches").select("id,name").order("id"), []); const [cats] = useData(() => sb.from("gl_accounts").select("code,name,type").order("code"), []); const [pay] = useData(() => sb.from("accounts").select("id,name").order("id"), []);
  const [exps, reloadExps] = useData(() => sb.rpc("list_expenses", { d_from: addDays(cairoToday(), -60), d_to: cairoToday() }), []);
  const [f, setF] = useState({ date: today, code: "6100", acct: "", amount: "", note: "" }); const [ob, setOb] = useState({ code: "1100", amount: "" });
  const load = useCallback(async () => { const r = await sb.rpc("acc_statements", { d_from: from, d_to: to, p_branch: branch ? +branch : null }); if (r.error) return setMsg("تعذّر تحميل البيانات: " + r.error.message); setRows(r.data.rows.map((x: any) => ({ ...x, p_debit: +x.p_debit, p_credit: +x.p_credit, c_debit: +x.c_debit, c_credit: +x.c_credit }))); }, [from, to, branch]);
  useEffect(() => { load(); }, [load]);
  async function addExp(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("create_expense", { p_account: +f.acct, p_code: f.code, p_amount: +f.amount, p_note: f.note || null, p_date: f.date, p_branch: branch ? +branch : null }); if (r.error) return setMsg("تعذّر تسجيل المصروف: راجع المبلغ والحساب."); setMsg("اتسجل المصروف."); setF({ ...f, amount: "", note: "" }); reloadExps(); load(); }
  async function addOb(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("add_opening_balance", { p_code: ob.code, p_amount: +ob.amount, p_date: from }); if (r.error) return setMsg("تعذّر تسجيل الرصيد."); setMsg("اتسجل الرصيد الافتتاحي."); setOb({ ...ob, amount: "" }); load(); }
  const rs = rows ?? []; const of = (t: string) => rs.filter(r => r.type === t); const cr = (r: R) => r.p_credit - r.p_debit; const dr = (r: R) => r.p_debit - r.p_credit;
  const sales = rs.find(r => r.code === "4100"), disc = rs.find(r => r.code === "4200"), oth = rs.find(r => r.code === "4900"), cogs = rs.find(r => r.code === "5100");
  const netSales = (sales ? cr(sales) : 0) + (disc ? cr(disc) : 0), gross = netSales - (cogs ? dr(cogs) : 0), opex = of("expense").filter(r => r.code !== "5100"), opexT = opex.reduce((a, r) => a + dr(r), 0), net = gross + (oth ? cr(oth) : 0) - opexT;
  const bal = (r: R) => r.c_debit - r.c_credit; const assets = of("asset"), liab = of("liability"); const capital = rs.find(r => r.code === "3100");
  const retained = of("revenue").reduce((a, r) => a + (r.c_credit - r.c_debit), 0) - of("expense").reduce((a, r) => a + (r.c_debit - r.c_credit), 0);
  const tA = assets.reduce((a, r) => a + bal(r), 0), tL = liab.reduce((a, r) => a - bal(r), 0), tE = (capital ? -bal(capital) : 0) + retained;
  return (
    <section>
      <div className="flex flex-wrap gap-1 border-b border-sand">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm font-bold -mb-px border-b-2 ${tab === k ? "border-espresso" : "border-transparent text-roast"}`}>{l}</button>)}</div>
      <div className="mt-3 flex flex-wrap items-end gap-2 text-sm"><label className="text-xs">من<input type="date" className="block" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="text-xs">إلى<input type="date" className="block" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
      {msg && <p role="status" className="mt-3 text-caramel font-bold text-sm">{msg}</p>}
      {!rows ? <p className="mt-4 text-roast">بنحمّل...</p> : <div className="mt-4">
        {tab === "pnl" && <div className={card + " max-w-xl"}><h3 className="font-black mb-2">قائمة الدخل</h3><table className="w-full text-sm"><tbody>
          <Row l="إيراد المبيعات" v={sales ? cr(sales) : 0} /><Row l="خصومات النقاط" v={disc ? cr(disc) : 0} i /><Row l="صافي المبيعات" v={netSales} b /><Row l="تكلفة البضاعة المباعة" v={cogs ? dr(cogs) : 0} /><Row l="مجمل الربح" v={gross} b />
          {opex.filter(r => dr(r) !== 0).map(r => <Row key={r.code} l={r.name} v={dr(r)} i />)}<Row l="إجمالي المصروفات" v={opexT} b /><Row l="إيرادات أخرى" v={oth ? cr(oth) : 0} /><Row l="صافي الربح" v={net} b /></tbody></table>
          <p className="text-xs text-roast mt-3 leading-6">المصروفات اللي بدون فرع مش بتظهر لما تختار فرع معيّن.</p></div>}
        {tab === "bs" && <div className="grid lg:grid-cols-2 gap-4 max-w-4xl"><div className={card}><h3 className="font-black mb-2">الأصول</h3><table className="w-full text-sm"><tbody>{assets.map(r => <Row key={r.code} l={r.name} v={bal(r)} />)}<Row l="إجمالي الأصول" v={tA} b /></tbody></table></div>
          <div className={card}><h3 className="font-black mb-2">الخصوم وحقوق الملكية</h3><table className="w-full text-sm"><tbody>{liab.map(r => <Row key={r.code} l={r.name} v={-bal(r)} />)}<Row l="رأس المال" v={capital ? -bal(capital) : 0} /><Row l="الأرباح المرحّلة (حتى التاريخ)" v={retained} /><Row l="الإجمالي" v={tL + tE} b /></tbody></table>
            {Math.abs(tA - tL - tE) > 0.01 && <p className="text-xs text-caramel mt-2">فرق في الميزانية: {M(tA - tL - tE)} (راجع الأرصدة الافتتاحية)</p>}</div></div>}
        {tab === "tb" && <div className={card + " overflow-x-auto"}><table className="w-full text-sm"><thead><tr className="text-right text-roast border-b border-sand"><th className="py-2">الكود</th><th>الحساب</th><th>مدين (الفترة)</th><th>دائن (الفترة)</th><th>الرصيد</th></tr></thead>
          <tbody>{rs.map(r => <tr key={r.code} className="border-b border-sand/60"><td className="py-2 num">{r.code}</td><td>{r.name}</td><td className="num">{M(r.p_debit)}</td><td className="num">{M(r.p_credit)}</td><td className="num font-bold">{M(Math.abs(bal(r)))} {bal(r) >= 0 ? "مدين" : "دائن"}</td></tr>)}</tbody></table></div>}
        {tab === "exp" && <div className="grid lg:grid-cols-2 gap-4"><form onSubmit={addExp} className={card + " space-y-3"}><h3 className="font-black">مصروف جديد</h3>
          <input type="date" className="w-full" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /><select className="w-full" value={f.code} onChange={e => setF({ ...f, code: e.target.value })}>{(cats as any[]).filter(c => c.type === "expense" && c.code !== "5100").map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          <select className="w-full" value={f.acct} onChange={e => setF({ ...f, acct: e.target.value })}><option value="">اتدفع من</option>{(pay as any[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input type="number" min={0} className="w-full" placeholder="المبلغ" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /><input className="w-full" placeholder="بيان" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
          <button disabled={!f.acct || !f.amount} className={btn + " w-full"}>سجّل</button></form>
          <div className={card}><h3 className="font-black mb-2">آخر مصروفات (٦٠ يوم)</h3>{(exps as any[]).length === 0 ? <p className="text-sm text-roast">لا يوجد.</p> : <ul className="divide-y divide-sand text-sm">{(exps as any[]).map(x => <li key={x.id} className="py-2 flex justify-between gap-3"><span>{x.entry_date} · {x.account}{x.memo ? ` · ${x.memo}` : ""}</span><b className="num">{M(x.amount)} ج</b></li>)}</ul>}</div></div>}
        {tab === "open" && <form onSubmit={addOb} className={card + " max-w-md space-y-3"}><h3 className="font-black">رصيد افتتاحي</h3><p className="text-xs text-roast leading-6">سجّل الأرصدة اللي المحل بادئ بيها (كاش، بنك، مخزون، مديونيات). مقابلها بيتسجل في رأس المال.</p>
          <select className="w-full" value={ob.code} onChange={e => setOb({ ...ob, code: e.target.value })}>{(cats as any[]).filter(c => (c.type === "asset" || c.type === "liability")).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          <input type="number" min={0} className="w-full" placeholder="المبلغ" value={ob.amount} onChange={e => setOb({ ...ob, amount: e.target.value })} /><button disabled={!ob.amount} className={btn + " w-full"}>سجّل</button></form>}
      </div>}
    </section>);
}

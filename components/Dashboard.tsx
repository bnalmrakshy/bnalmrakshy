"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Counter from "@/components/Counter";
import Sk from "@/components/Skeleton";
import { card, useData } from "@/components/ui";
import { sb, cairoToday } from "@/lib/supabase";
import { useAdmin } from "@/components/admin/ctx";
import { METHOD, M, addDays } from "@/lib/erp";
const C = ["#141414", "#B07B52", "#4A2F20", "#9C6B45", "#CDB9A6"];
const TIP = { contentStyle: { borderRadius: 14, border: 0, boxShadow: "0 8px 24px rgba(0,0,0,.14)", direction: "rtl" as const }, labelStyle: { fontWeight: 800 } };
const WD = ["", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const dl = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
const hr = (h: number) => `${h % 12 || 12}${h < 12 ? "ص" : "م"}`;
const days = (from: string, to: string) => { const o: string[] = []; for (let d = from; d <= to && o.length < 400; d = addDays(d, 1)) o.push(d); return o; };
const MET: [string, string][] = [["sales", "المبيعات"], ["profit", "الربح"], ["n", "الفواتير"]];
const IT: [string, string][] = [["revenue", "الإيراد"], ["qty", "الكمية"], ["profit", "الربح"]];
function Kpi({ l, v, p, cmp, money = true }: any) {
  const d = cmp && p != null ? dl(v, p) : null;
  return <div className="rounded-xl border border-sand bg-white p-4"><p className="text-xs text-roast">{l}</p><p className="mt-1 text-2xl font-black num">{M(v)}{money && <span className="text-sm font-bold text-roast"> ج</span>}</p>
    {d !== null && <p className={`text-xs mt-1 num ${d >= 0 ? "text-espresso" : "text-caramel"}`}>{d >= 0 ? "▲" : "▼"} {M(Math.abs(d))}٪ عن الفترة السابقة</p>}</div>;
}
const Box = ({ t, children, h = 256 }: { t: string; children: React.ReactNode; h?: number }) => <div className={card}><h3 className="font-black mb-3">{t}</h3><div dir="ltr" style={{ height: h }}>{children}</div></div>;
const Empty = () => <p className="text-sm text-roast grid place-items-center h-full" dir="rtl">لا بيانات في الفترة دي.</p>;

function Alerts() {
  const [a, reload] = useData(() => sb.rpc("admin_alerts"), null);
  if (!a) return null;
  async function closeIt(id: number) { const v = prompt("عدّ الكاش اللي في الدُرج واكتب المبلغ:"); if (v === null) return; const r = await sb.rpc("admin_close_shift", { p_id: id, counted: +v || 0, nt: "قفل من الأدمن" }); if (r.error) alert("تعذّر القفل: " + r.error.message); reload(); }
  const rows: [string, React.ReactNode][] = [];
  if (a.low_stock.length) rows.push(["مخزون واطي", a.low_stock.map((x: any) => `${x.name} (${M(x.stock)})`).join("، ")]);
  a.open_shifts.forEach((x: any) => rows.push(["شيفت مفتوح", <span key={x.id}>{x.cashier_name} #{x.id} من {new Date(x.opened_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short", timeStyle: "short" })} <button onClick={() => closeIt(x.id)} className="underline font-bold mr-2">قفل</button></span>]));
  a.cash_diffs.forEach((x: any) => rows.push(["فرق في الكاش", `${x.cashier_name} #${x.id}: ${M(x.diff)} ج`]));
  if (a.debtors.length) rows.push(["مديونيات العملاء", a.debtors.map((x: any) => `${x.name} (${M(x.balance)} ج)`).join("، ")]);
  if (a.stale > 0) rows.push(["فواتير قديمة مفتوحة", `${M(a.stale)} فاتورة`]);
  if (!rows.length) return <div className="rounded-2xl border border-sand p-3 text-sm text-roast">مفيش تنبيهات. كله تمام.</div>;
  return <div className="rounded-2xl border border-caramel p-4"><h3 className="font-black mb-2">تنبيهات ({M(rows.length)})</h3><ul className="space-y-1.5 text-sm">{rows.map(([t, v], i) => <li key={i}><b>{t}:</b> {v}</li>)}</ul></div>;
}
export default function Dashboard() {
  const { branch } = useAdmin();
  const today = cairoToday(); const [from, setFrom] = useState(addDays(today, -6)); const [to, setTo] = useState(today); const [shift, setShift] = useState(""); const [cmp, setCmp] = useState(true);
  const [metric, setMetric] = useState("sales"); const [imet, setImet] = useState("revenue"); const [sel, setSel] = useState<number | null>(null); const [d, setD] = useState<any>(null); const [msg, setMsg] = useState("");
  const [shifts] = useData(() => sb.from("shifts").select("id,cashier_name,opened_at").order("id", { ascending: false }).limit(80), []);
  const run = useCallback(async () => { setMsg(""); const r = await sb.rpc("dashboard_data", { d_from: from, d_to: to, p_shift: shift ? +shift : null, p_branch: branch ? +branch : null }); if (r.error) return setMsg("تعذّر تحميل اللوحة: " + r.error.message); setD(r.data); setSel(null); }, [from, to, shift, branch]);
  useEffect(() => { run(); }, [run]);
  const single = from === to;
  const trend = useMemo(() => {
    if (!d) return [] as any[];
    if (single) { const m = new Map<number, any>(d.by_hour.map((x: any) => [x.h, x])); return Array.from({ length: 24 }, (_, h) => ({ k: hr(h), sales: +(m.get(h)?.sales ?? 0), profit: +(m.get(h)?.profit ?? 0), n: +(m.get(h)?.n ?? 0) })); }
    const m = new Map<string, any>(d.daily.map((x: any) => [x.d, x])); return days(from, to).map(k => ({ k, sales: +(m.get(k)?.sales ?? 0), profit: +(m.get(k)?.profit ?? 0), n: +(m.get(k)?.n ?? 0) }));
  }, [d, single, from, to]);
  const eng = useMemo(() => { if (!d) return [] as any[]; const a = new Map<string, any>(d.members.map((x: any) => [x.d, x])); const b = new Map<string, any>(d.points.map((x: any) => [x.d, x]));
    return days(from, to).map(k => ({ k, members: +(a.get(k)?.n ?? 0), issued: +(b.get(k)?.issued ?? 0), redeemed: +(b.get(k)?.redeemed ?? 0) })); }, [d, from, to]);
  const drill = (k: any) => { if (!single && typeof k === "string" && /^\d{4}-/.test(k)) { setFrom(k); setTo(k); } };
  const preset = (a: string, b: string) => { setFrom(a); setTo(b); };
  if (!d) return <div>{msg ? <p className="text-caramel font-bold">{msg}</p> : <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3, 4, 5, 6, 7].map(k => <Sk key={k} className="h-24" />)}</div>}</div>;
  const k = d.kpi, pv = d.prev; const methods = d.by_method.map((x: any) => ({ name: METHOD[x.method] ?? x.method, value: +x.amount, n: x.n })); const msum = methods.reduce((a: number, x: any) => a + x.value, 0);
  const cats = d.by_category.map((x: any) => ({ name: x.name, value: +x.revenue })); const items = [...d.items].sort((a: any, b: any) => +b[imet] - +a[imet]).slice(0, 8).map((x: any) => ({ name: x.name, v: +x[imet] }));
  const wd = Array.from({ length: 7 }, (_, i) => { const r = d.by_weekday.find((x: any) => x.w === i + 1); return { k: WD[i + 1], sales: +(r?.sales ?? 0) }; });
  const hours = Array.from({ length: 24 }, (_, h) => { const r = d.by_hour.find((x: any) => x.h === h); return { k: hr(h), sales: +(r?.sales ?? 0) }; }); const pk = hours.reduce((a, x) => (x.sales > a.sales ? x : a), hours[0]); const bw = wd.reduce((a, x) => (x.sales > a.sales ? x : a), wd[0]);
  const none = k.count === 0; const tick = (v: any) => (single ? v : String(v).slice(5)); const lab = MET.find(m => m[0] === metric)![1];
  return (
    <section className="space-y-5">
      <Alerts />
      <div className="flex flex-wrap items-end gap-2 text-sm">
        {[["النهارده", today, today], ["امبارح", addDays(today, -1), addDays(today, -1)], ["٧ أيام", addDays(today, -6), today], ["٣٠ يوم", addDays(today, -29), today], ["الشهر ده", today.slice(0, 8) + "01", today]].map(([l, a, b]) => <button key={l} onClick={() => preset(a, b)} className={`px-3 py-2 rounded-full font-bold ${from === a && to === b ? "bg-espresso text-cream" : "bg-sand"}`}>{l}</button>)}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="!w-auto" /><input type="date" value={to} onChange={e => setTo(e.target.value)} className="!w-auto" />
        <select value={shift} onChange={e => setShift(e.target.value)} className="!w-auto"><option value="">كل الشيفتات</option>{(shifts as any[]).map(x => <option key={x.id} value={x.id}>#{x.id} · {x.cashier_name}</option>)}</select>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={cmp} onChange={e => setCmp(e.target.checked)} />قارن بالفترة اللي قبلها</label></div>
      {msg && <p className="text-caramel font-bold">{msg}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi i={0} l="المبيعات" v={k.sales} p={pv.sales} cmp={cmp} /><Kpi i={1} l="الربح التقديري" v={k.profit} p={pv.profit} cmp={cmp} /><Kpi i={2} l="الفواتير" v={k.count} p={pv.count} cmp={cmp} money={false} /><Kpi i={3} l="متوسط الفاتورة" v={k.count ? k.sales / k.count : 0} p={pv.count ? pv.sales / pv.count : 0} cmp={cmp} />
        <Kpi i={4} l="عملاء التطبيق" v={k.customers} p={pv.customers} cmp={cmp} money={false} /><Kpi i={5} l="أعضاء جدد" v={k.members} p={pv.members} cmp={cmp} money={false} /><Kpi i={6} l="نقاط اتمنحت" v={k.issued} p={pv.issued} cmp={cmp} money={false} /><Kpi i={7} l="نقاط اتستبدلت" v={k.redeemed} p={pv.redeemed} cmp={cmp} money={false} /></div>
      {!none && <div className="grid sm:grid-cols-3 gap-3 text-sm">{[["ساعة الذروة", pk.sales ? pk.k : "—"], ["أنشط يوم", bw.sales ? bw.k : "—"], ["أكتر صنف", d.items[0]?.name ?? "—"]].map(([l, v]) => <div key={l} className="rounded-2xl border border-sand p-3"><p className="text-xs text-roast">{l}</p><p className="font-black">{v}</p></div>)}</div>}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 className="font-black">{lab} {single ? "على مدار اليوم (بالساعة)" : "يوم بيوم"}</h3>
          <div className="flex gap-1">{MET.map(([m, l]) => <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${metric === m ? "bg-espresso text-cream" : "bg-white"}`}>{l}</button>)}</div></div>
        <div dir="ltr" className="h-72">{none ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} onClick={(s: any) => s?.activeLabel && drill(s.activeLabel)} style={{ cursor: single ? "default" : "pointer" }}>
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B07B52" stopOpacity={.55} /><stop offset="100%" stopColor="#B07B52" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE6E0" /><XAxis dataKey="k" tickFormatter={tick} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={44} />
          <Tooltip {...TIP} formatter={(v: any) => [M(v), lab]} /><Area isAnimationActive={false} type="monotone" dataKey={metric} stroke="#4A2F20" strokeWidth={2.5} fill="url(#g)" activeDot={{ r: 6 }} /></AreaChart></ResponsiveContainer>}</div>
        {!single && !none && <p className="text-xs text-roast mt-2">اضغط على أي يوم في الرسم عشان تشوف تفاصيله بالساعة.</p>}</div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Box t="طرق الدفع (اضغط على شريحة)">{msum === 0 ? <Empty /> : <div className="relative h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={methods} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2} onClick={(_: any, i: number) => setSel(sel === i ? null : i)}>
          {methods.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} fillOpacity={sel === null || sel === i ? 1 : .3} style={{ cursor: "pointer" }} />)}</Pie><Tooltip {...TIP} formatter={(v: any) => M(v) + " ج"} /></PieChart></ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none text-center" dir="rtl"><div><p className="text-xs text-roast">{sel === null ? "الإجمالي" : methods[sel].name}</p><p className="font-black text-lg num">{M(sel === null ? msum : methods[sel].value)}</p>{sel !== null && <p className="text-xs text-roast num">{M(Math.round((methods[sel].value / msum) * 100))}٪ · {M(methods[sel].n)} فاتورة</p>}</div></div></div>}</Box>
        <Box t="المبيعات حسب القسم">{cats.length === 0 ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={cats} dataKey="value" nameKey="name" outerRadius={96} label={(e: any) => e.name}>{cats.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Pie><Tooltip {...TIP} formatter={(v: any) => M(v) + " ج"} /></PieChart></ResponsiveContainer>}</Box>
        <div className={card}><div className="flex items-center justify-between mb-3"><h3 className="font-black">أكتر الأصناف</h3><div className="flex gap-1">{IT.map(([m, l]) => <button key={m} onClick={() => setImet(m)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${imet === m ? "bg-espresso text-cream" : "bg-white"}`}>{l}</button>)}</div></div>
          <div dir="ltr" className="h-72">{items.length === 0 ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={items} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip {...TIP} formatter={(v: any) => [M(v), IT.find(m => m[0] === imet)![1]]} cursor={{ fill: "#EDE6E0" }} /><Bar isAnimationActive={false} dataKey="v" radius={[0, 8, 8, 0]}>{items.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#141414" : "#B07B52"} />)}</Bar></BarChart></ResponsiveContainer>}</div></div>
        <Box t="ساعات الذروة" h={288}>{!pk.sales ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={hours}><CartesianGrid strokeDasharray="3 3" stroke="#EDE6E0" vertical={false} /><XAxis dataKey="k" tick={{ fontSize: 10 }} interval={1} /><YAxis hide /><Tooltip {...TIP} formatter={(v: any) => [M(v) + " ج", "المبيعات"]} cursor={{ fill: "#EDE6E0" }} />
          <Bar isAnimationActive={false} dataKey="sales" radius={[6, 6, 0, 0]}>{hours.map((x, i) => <Cell key={i} fill={x.k === pk.k ? "#141414" : "#CDB9A6"} />)}</Bar></BarChart></ResponsiveContainer>}</Box>
        <Box t="حسب أيام الأسبوع">{!bw.sales ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={wd}><XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis hide /><Tooltip {...TIP} formatter={(v: any) => [M(v) + " ج", "المبيعات"]} cursor={{ fill: "#EDE6E0" }} /><Bar isAnimationActive={false} dataKey="sales" radius={[8, 8, 0, 0]}>{wd.map((x, i) => <Cell key={i} fill={x.k === bw.k ? "#141414" : "#B07B52"} />)}</Bar></BarChart></ResponsiveContainer>}</Box>
        <Box t="الكاشير">{d.by_cashier.length === 0 ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={d.by_cashier.map((x: any) => ({ name: x.name, v: +x.amount }))}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis hide /><Tooltip {...TIP} formatter={(v: any) => [M(v) + " ج", "المبيعات"]} cursor={{ fill: "#EDE6E0" }} /><Bar isAnimationActive={false} dataKey="v" fill="#4A2F20" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>}</Box>
        <Box t="نقاط اتمنحت واتستبدلت">{eng.every((x: any) => !x.issued && !x.redeemed) ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={eng}><CartesianGrid strokeDasharray="3 3" stroke="#EDE6E0" /><XAxis dataKey="k" tickFormatter={(v: any) => String(v).slice(5)} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={44} />
          <Tooltip {...TIP} /><Area isAnimationActive={false} type="monotone" dataKey="issued" name="اتمنحت" stroke="#B07B52" fill="#B07B52" fillOpacity={.25} /><Area isAnimationActive={false} type="monotone" dataKey="redeemed" name="اتستبدلت" stroke="#141414" fill="#141414" fillOpacity={.15} /></AreaChart></ResponsiveContainer>}</Box>
        <Box t="أعضاء جدد في التطبيق">{eng.every((x: any) => !x.members) ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={eng}><CartesianGrid strokeDasharray="3 3" stroke="#EDE6E0" /><XAxis dataKey="k" tickFormatter={(v: any) => String(v).slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={30} tick={{ fontSize: 11 }} /><Tooltip {...TIP} formatter={(v: any) => [M(v), "أعضاء جدد"]} /><Line isAnimationActive={false} type="monotone" dataKey="members" stroke="#141414" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>}</Box>
        <div className={card}><h3 className="font-black">أكتر عملاء التطبيق إنفاقًا</h3>{d.top_customers.length === 0 ? <p className="text-sm text-roast mt-3">لسه مفيش عملاء مسحوا فواتير.</p> : <ol className="mt-3 space-y-2">{d.top_customers.map((c: any, i: number) => <li key={i} className="flex items-center gap-3 text-sm"><span className="w-6 h-6 rounded-full bg-white grid place-items-center font-black num">{M(i + 1)}</span><span className="flex-1 font-bold truncate">{c.display_name}</span><span className="text-xs text-roast num">{M(c.visits)} زيارة</span><b className="num">{M(c.spent)} ج</b></li>)}</ol>}</div>
      </div>
    </section>);
}

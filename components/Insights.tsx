"use client";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { btn, card, useData } from "@/components/ui";
import { sb } from "@/lib/supabase";
import { M, exportAnalytics } from "@/lib/erp";
const Chart = ({ t, data }: { t: string; data: { name: string; n: number }[] }) => (
  <div className={card}><h3 className="font-black mb-3">{t}</h3><div dir="ltr" className="h-56">{data.length === 0 ? <p className="text-sm text-roast grid place-items-center h-full" dir="rtl">لسه مفيش بيانات.</p> :
    <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => [M(v), "عميل"]} /><Bar isAnimationActive={false} dataKey="n" radius={[6, 6, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={i === 0 ? "#141414" : "#B07B52"} />)}</Bar></BarChart></ResponsiveContainer>}</div></div>);
export default function Insights() {
  const [s, reload, err] = useData(() => sb.rpc("area_stats"), null); const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function addArea(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("admin_add_area", { p_name: name }); if (r.error) return setMsg("تعذّرت الإضافة."); setName(""); setMsg("اتضافت المنطقة."); reload(); }
  async function exp() { setBusy(true); setMsg(""); const r = await sb.rpc("analytics_export"); setBusy(false); if (r.error) return setMsg("تعذّر التصدير: " + r.error.message); await exportAnalytics(r.data); setMsg("اتحمّل ملفين: Excel وJSON."); }
  if (!s) return <p className="text-roast">{err || "بنحمّل..."}</p>;
  const pct = s.members ? Math.round((s.with_location / s.members) * 100) : 0;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[["إجمالي الأعضاء", M(s.members)], ["شاركوا موقعهم", `${M(s.with_location)} (${M(pct)}٪)`], [`جوه ${M(s.radius)} كم من فرع`, M(s.in_radius)], ["مناطق مسجلة", M(s.by_area.length)]].map(([l, v]) =>
        <div key={l} className="rounded-xl border border-sand bg-white p-4"><p className="text-xs text-roast">{l}</p><p className="mt-1 text-2xl font-black num">{v}</p></div>)}</div>
      <div className="grid lg:grid-cols-3 gap-4"><Chart t="العملاء حسب المنطقة" data={s.by_area.map((x: any) => ({ name: x.name, n: +x.n }))} /><Chart t="أقرب فرع" data={s.by_branch.map((x: any) => ({ name: x.name, n: +x.n }))} /><Chart t="المسافة من أقرب فرع" data={s.buckets.map((x: any) => ({ name: x.bucket, n: +x.n }))} /></div>
      <div className={card}><h3 className="font-black">إضافة منطقة (للقايمة اللي العميل بيختار منها)</h3><form onSubmit={addArea} className="mt-2 flex gap-2"><input className="flex-1" placeholder="اسم المنطقة" value={name} onChange={e => setName(e.target.value)} /><button className={btn}>إضافة</button></form></div>
      <div className={card}><h3 className="font-black">تصدير بيانات التحليل</h3><p className="text-sm text-roast mt-1 leading-7">جداول جاهزة للتحليل (المبيعات والأصناف والأعضاء والنقاط) بأسماء مستعارة، من غير أسماء أو يوزرات، والموقع مقرّب.</p>
        <button disabled={busy} onClick={exp} className={btn + " mt-3"}>{busy ? "لحظة..." : "تحميل Excel + JSON"}</button></div>
      {msg && <p role="status" className="text-caramel font-bold text-sm">{msg}</p>}
    </section>);
}

"use client";
import { useState } from "react";
import { btn, card, useData } from "@/components/ui";
import { sb } from "@/lib/supabase";
const Msg = ({ t }: { t: string }) => (t ? <p role="status" className="mt-3 text-caramel font-bold text-sm">{t}</p> : null);
export function BranchesSettings() {
  const [rows, reload] = useData(() => sb.from("branches").select("*").order("id"), []); const [e, setE] = useState<Record<number, any>>({}); const [nw, setNw] = useState({ name: "", address: "", lat: "", lng: "", maps: "" }); const [msg, setMsg] = useState("");
  const v = (r: any, k: string) => e[r.id]?.[k] ?? r[k]; const set = (r: any, k: string, x: any) => setE(o => ({ ...o, [r.id]: { ...o[r.id], [k]: x } }));
  async function save(r: any) { const x = await sb.rpc("admin_save_branch", { p_id: r.id, p_name: v(r, "name"), p_address: v(r, "address"), p_lat: +v(r, "lat"), p_lng: +v(r, "lng"), p_maps: v(r, "maps_url"), p_active: v(r, "active") }); setMsg(x.error ? "تعذّر الحفظ (راجع البيانات)." : "اتحفظ."); reload(); }
  async function add(ev: React.FormEvent) { ev.preventDefault(); const x = await sb.rpc("admin_save_branch", { p_id: null, p_name: nw.name, p_address: nw.address, p_lat: +nw.lat, p_lng: +nw.lng, p_maps: nw.maps || null, p_active: true }); if (x.error) return setMsg("تعذّرت الإضافة (راجع الإحداثيات)."); setNw({ name: "", address: "", lat: "", lng: "", maps: "" }); setMsg("اتضاف الفرع."); reload(); }
  return (
    <section className="space-y-3">{(rows as any[]).map(r => (
      <div key={r.id} className={card + " grid sm:grid-cols-2 gap-2 text-sm"}>
        <label>الاسم<input className="w-full" value={v(r, "name")} onChange={x => set(r, "name", x.target.value)} /></label><label>العنوان<input className="w-full" value={v(r, "address") ?? ""} onChange={x => set(r, "address", x.target.value)} /></label>
        <label>خط العرض<input className="w-full" dir="ltr" value={v(r, "lat")} onChange={x => set(r, "lat", x.target.value)} /></label><label>خط الطول<input className="w-full" dir="ltr" value={v(r, "lng")} onChange={x => set(r, "lng", x.target.value)} /></label>
        <label className="sm:col-span-2">رابط الخريطة<input className="w-full" dir="ltr" value={v(r, "maps_url") ?? ""} onChange={x => set(r, "maps_url", x.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v(r, "active")} onChange={x => set(r, "active", x.target.checked)} />شغّال</label><button onClick={() => save(r)} className={btn}>حفظ</button></div>))}
      <form onSubmit={add} className={card + " grid sm:grid-cols-2 gap-2 text-sm"}><h3 className="font-black sm:col-span-2">فرع جديد</h3>
        <input placeholder="الاسم" value={nw.name} onChange={x => setNw({ ...nw, name: x.target.value })} /><input placeholder="العنوان" value={nw.address} onChange={x => setNw({ ...nw, address: x.target.value })} />
        <input placeholder="خط العرض 30.14" dir="ltr" value={nw.lat} onChange={x => setNw({ ...nw, lat: x.target.value })} /><input placeholder="خط الطول 31.72" dir="ltr" value={nw.lng} onChange={x => setNw({ ...nw, lng: x.target.value })} />
        <input className="sm:col-span-2" placeholder="رابط الخريطة" dir="ltr" value={nw.maps} onChange={x => setNw({ ...nw, maps: x.target.value })} /><button className={btn + " sm:col-span-2"}>إضافة فرع</button></form><Msg t={msg} /></section>);
}
export function AreasSettings() {
  const [rows, reload] = useData(() => sb.from("areas").select("*").order("district").order("id"), []); const [br] = useData(() => sb.from("branches").select("id,name").order("id"), []);
  const [e, setE] = useState<Record<number, any>>({}); const [nw, setNw] = useState({ name: "", district: "" }); const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  const v = (r: any, k: string) => e[r.id]?.[k] ?? r[k]; const set = (r: any, k: string, x: any) => setE(o => ({ ...o, [r.id]: { ...o[r.id], [k]: x } }));
  async function save(r: any) { const x = await sb.rpc("admin_save_area", { p_id: r.id, p_name: v(r, "name"), p_district: v(r, "district"), p_enabled: v(r, "delivery_enabled"), p_fee: +v(r, "delivery_fee") || 0, p_min: +v(r, "min_order") || 0, p_branch: v(r, "branch_id") ? +v(r, "branch_id") : null, p_active: v(r, "active") }); setMsg(x.error ? "تعذّر الحفظ." : "اتحفظ: " + v(r, "name")); reload(); }
  async function add(ev: React.FormEvent) { ev.preventDefault(); const x = await sb.rpc("admin_save_area", { p_id: null, p_name: nw.name, p_district: nw.district || null, p_enabled: false, p_fee: 0, p_min: 0, p_branch: null, p_active: true }); if (x.error) return setMsg("تعذّرت الإضافة."); setNw({ name: "", district: "" }); reload(); }
  const list = (rows as any[]).filter(r => !q || r.name.includes(q) || (r.district ?? "").includes(q));
  return (
    <section>
      <p className="text-sm text-roast leading-7">فعّل التوصيل للمناطق اللي بتخدمها، وحدد رسوم التوصيل وأقل طلب والفرع اللي بيجهّز الطلب. المناطق مأخوذة من عناوين صفحات خريطة بدر وتقدر تعدّل أو تضيف.</p>
      <input className="mt-3 w-full" placeholder="دوّر على منطقة" value={q} onChange={x => setQ(x.target.value)} /><Msg t={msg} />
      <ul className="mt-3 space-y-2">{list.map(r => (
        <li key={r.id} className={card + " text-sm"}><div className="flex items-center justify-between gap-3"><b>{r.name}</b><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={v(r, "delivery_enabled")} onChange={x => set(r, "delivery_enabled", x.target.checked)} />توصيل</label></div>
          <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2 items-end"><label>الرسوم (ج)<input type="number" min={0} className="w-full" value={v(r, "delivery_fee")} onChange={x => set(r, "delivery_fee", x.target.value)} /></label>
            <label>أقل طلب (ج)<input type="number" min={0} className="w-full" value={v(r, "min_order")} onChange={x => set(r, "min_order", x.target.value)} /></label>
            <label>الفرع<select className="w-full" value={v(r, "branch_id") ?? ""} onChange={x => set(r, "branch_id", x.target.value)}><option value="">تلقائي</option>{(br as any[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <button onClick={() => save(r)} className={btn}>حفظ</button></div></li>))}</ul>
      <form onSubmit={add} className={card + " mt-4 flex flex-wrap gap-2"}><input className="flex-1 min-w-[10rem]" placeholder="منطقة جديدة" value={nw.name} onChange={x => setNw({ ...nw, name: x.target.value })} /><input className="flex-1 min-w-[8rem]" placeholder="الحي (اختياري)" value={nw.district} onChange={x => setNw({ ...nw, district: x.target.value })} /><button className={btn}>إضافة</button></form></section>);
}
export function SystemSettings() {
  const [s, reload] = useData(() => sb.from("app_settings").select("delivery_radius_km,points_per_egp,accounting_locked_until").single(), null); const [km, setKm] = useState(""); const [msg, setMsg] = useState("");
  async function backup() {
    const r = await sb.rpc("backup_data"); if (r.error) return setMsg("تعذّر عمل النسخة: " + r.error.message);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)], { type: "application/json" })); a.download = `نسخة_احتياطية_${new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })}.json`; a.click(); URL.revokeObjectURL(a.href); setMsg("اتحمّلت النسخة.");
  }
  async function radius(e: React.FormEvent) { e.preventDefault(); const r = await sb.rpc("admin_set_radius", { p_km: +km }); setMsg(r.error ? "تعذّر الحفظ (١ لـ ٥٠ كم)." : "اتحفظ."); reload(); }
  return (
    <section className="grid lg:grid-cols-2 gap-4">
      <div className={card}><h3 className="font-black">نسخة احتياطية</h3><p className="text-sm text-roast mt-1 leading-7">حمّل نسخة كاملة من بيانات المحل (JSON). اعملها بانتظام.</p><button onClick={backup} className={btn + " mt-3"}>تحميل نسخة احتياطية</button></div>
      <form onSubmit={radius} className={card}><h3 className="font-black">نطاق التوصيل بالمسافة</h3><p className="text-sm text-roast mt-1">الحالي: {s ? `${s.delivery_radius_km} كم` : "..."} (بيستخدم في تحليلات العملاء)</p><div className="mt-3 flex gap-2"><input type="number" step="0.5" min={1} max={50} placeholder="كم" value={km} onChange={e => setKm(e.target.value)} /><button className={btn}>حفظ</button></div></form>
      <div className={card + " lg:col-span-2 text-sm text-roast leading-7"}>نظام النقاط: كل {s?.points_per_egp ?? 10} نقط = ١ جنيه. {s?.accounting_locked_until ? `الحسابات مقفولة حتى ${s.accounting_locked_until}.` : "مفيش فترة محاسبية مقفولة."}</div><Msg t={msg} /></section>);
}

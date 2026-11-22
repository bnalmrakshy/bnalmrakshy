"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sb } from "@/lib/supabase";
const SKIP = ["/pos", "/office", "/admin", "/scan", "/checkin", "/login", "/register", "/privacy", "/profile"];
export default function LocationPrompt() {
  const p = usePathname(); const [show, setShow] = useState(false); const [areas, setAreas] = useState<{ id: number; name: string }[]>([]); const [area, setArea] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (SKIP.some(x => p.startsWith(x))) { setShow(false); return; }
    let t: ReturnType<typeof setTimeout>;
    (async () => {
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const pr = await sb.from("profiles").select("role").eq("id", session.user.id).single(); if (pr.data?.role !== "member") return;
      const l = await sb.from("member_locations").select("member_id").eq("member_id", session.user.id).maybeSingle(); if (l.error || l.data) return;
      const a = await sb.from("areas").select("id,name").eq("active", true).order("id"); setAreas(a.data ?? []); t = setTimeout(() => setShow(true), 3500);
    })();
    return () => clearTimeout(t);
  }, [p]);
  function gps() {
    if (!navigator.geolocation) return setMsg("المتصفح مش بيدعم تحديد الموقع. اختار منطقتك."); setBusy(true); setMsg("");
    navigator.geolocation.getCurrentPosition(async pos => { const r = await sb.rpc("set_my_location", { p_area: null, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude }); setBusy(false); if (r.error) setMsg("حصلت مشكلة، جرّب تاني."); else setShow(false); },
      () => { setBusy(false); setMsg("مفيش مشكلة، تقدر تختار منطقتك بدل كده."); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }
  async function pick() { if (!area) return; setBusy(true); const r = await sb.rpc("set_my_location", { p_area: +area, p_lat: null, p_lng: null }); setBusy(false); if (r.error) setMsg("حصلت مشكلة، جرّب تاني."); else setShow(false); }
  async function skip() { await sb.rpc("skip_location"); setShow(false); }
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-espresso/60 grid items-end lg:place-items-center" role="dialog" aria-modal>
      <div className="bg-white w-full lg:max-w-md rounded-t-[2rem] lg:rounded-[2rem] p-6 space-y-4">
        <h2 className="text-xl font-black">تحب نوصلك أسرع؟</h2>
        <p className="text-sm text-roast leading-7">لو سمحت لنا نعرف منطقتك تقريبًا، نقدر نعرض لك أقرب فرع ونجهّز خدمة التوصيل. بنحفظ موقع تقريبي بس (مش عنوانك بالظبط)، وتقدر تمسحه في أي وقت من حسابك. <Link href="/privacy" className="underline font-bold">إزاي بنستخدم بياناتك؟</Link></p>
        <button disabled={busy} onClick={gps} className="w-full bg-espresso text-cream font-bold py-3.5 disabled:opacity-50">{busy ? "لحظة..." : "السماح بالموقع التقريبي"}</button>
        {areas.length > 0 && <div className="flex gap-2"><select value={area} onChange={e => setArea(e.target.value)} className="flex-1"><option value="">أو اختار منطقتك</option>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><button disabled={!area || busy} onClick={pick} className="border border-espresso font-bold px-5 disabled:opacity-40">تمام</button></div>}
        {msg && <p role="status" className="text-sm text-caramel font-bold">{msg}</p>}
        <button onClick={skip} className="w-full text-sm text-roast py-1">مش دلوقتي</button>
      </div></div>);
}

"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
export default function LocationCard({ id }: { id: string }) {
  const [row, setRow] = useState<any>(undefined); const [msg, setMsg] = useState("");
  const load = async () => { const r = await sb.from("member_locations").select("source,dist_km,updated_at,areas(name),branches(name)").eq("member_id", id).maybeSingle(); setRow(r.data ?? null); };
  useEffect(() => { load(); }, [id]); // eslint-disable-line
  function gps() {
    setMsg(""); if (!navigator.geolocation) return setMsg("المتصفح مش بيدعم تحديد الموقع.");
    navigator.geolocation.getCurrentPosition(async p => { const r = await sb.rpc("set_my_location", { p_area: null, p_lat: p.coords.latitude, p_lng: p.coords.longitude }); setMsg(r.error ? "حصلت مشكلة." : "اتحدّث."); load(); }, () => setMsg("مقدرناش نوصل للموقع. فعّل الإذن من إعدادات المتصفح."), { timeout: 10000 });
  }
  async function clear() { await sb.rpc("clear_my_location"); setMsg("اتمسح موقعك."); load(); }
  const has = row && row.source !== "skipped";
  return (
    <div className="mt-4 rounded-3xl bg-sand/60 p-5 space-y-3"><h2 className="font-black">موقعي</h2>
      <p className="text-sm text-roast leading-7">{has ? `${row.areas?.name ?? "موقع تقريبي"}${row.branches?.name ? ` · أقرب فرع: ${row.branches.name}` : ""}` : "مش مشاركنا موقعك. ده اختياري تمامًا."}</p>
      <div className="flex gap-3"><button onClick={gps} className="flex-1 border border-espresso font-bold py-3">{has ? "حدّث موقعي" : "شارك موقعي التقريبي"}</button>{row && <button onClick={clear} className="px-4 text-sm underline text-roast">امسح</button>}</div>
      {msg && <p role="status" className="text-sm text-caramel font-bold">{msg}</p>}</div>);
}

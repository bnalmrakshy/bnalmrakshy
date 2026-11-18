"use client";
import { useCallback, useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import { sb, ar, cairoToday, isFriday } from "@/lib/supabase";
type F = { id: string; code: string | null; claimed_day: string | null; used_at: string | null };
function Mine({ me }: { me: Me }) {
  const [f, setF] = useState<F[] | null>(null); const [msg, setMsg] = useState(""); const [err, setErr] = useState(false);
  const load = useCallback(async () => { const r = await sb.from("free_drinks").select("id,code,claimed_day,used_at").eq("member_id", me.id).order("earned_at", { ascending: false }); r.error ? setErr(true) : setF(r.data); }, [me.id]);
  useEffect(() => { load(); }, [load]);
  async function claim() {
    setMsg(""); const { error } = await sb.rpc("claim_free_drink");
    if (error) setMsg(error.message.includes("friday") ? "الاستلام يوم الجمعة بس." : error.message.includes("no drink") ? "مفيش مشروب مستني." : "حصلت مشكلة، جرّب تاني."); else load();
  }
  if (err) return <p className="mt-8">مقدرناش نحمّل مكافآتك. <button className="underline font-bold" onClick={() => { setErr(false); load(); }}>جرّب تاني</button></p>;
  if (!f) return <p className="mt-8 text-roast/60">بنحمّل...</p>;
  const today = cairoToday(); const waiting = f.some(x => !x.used_at && !(x.code && x.claimed_day === today));
  return (
    <div className="mt-8">
      {f.length === 0 && <p className="leading-8">لسه معندكش مشروب مجاني. كمّل {""}الستريك وهييجي.</p>}
      <ul>{f.map(x => { const live = !x.used_at && x.code && x.claimed_day === today;
        return <li key={x.id} className="py-4 border-b border-sand flex items-center justify-between">
          <span className="font-bold">مشروب مجاني</span>
          {x.used_at ? <span className="text-roast/60">اتستخدم</span> : live ? <span className="text-3xl font-black tracking-widest text-brass" dir="ltr">{x.code}</span> : <span className="text-caramel font-semibold">مستحق</span>}
        </li>; })}</ul>
      {waiting && (isFriday() ? <button onClick={claim} className="mt-6 w-full bg-espresso text-cream font-bold py-4 active:scale-[.98]">استلم كود المشروب</button> : <p className="mt-6 text-roast">تقدر تاخد الكود يوم الجمعة بس.</p>)}
      {msg && <p role="status" className="mt-4 text-caramel font-semibold">{msg}</p>}
    </div>);
}
export default function Rewards() {
  return (
    <main className="px-6 py-12 md:px-16 max-w-xl">
      <h1 className="text-4xl font-black">الجمعة علينا</h1>
      <ul className="mt-6 space-y-3 leading-7 text-roast">
        <li>• زور المحل أيام ورا بعض لحد ما تكمّل الستريك، ومشروب يتضاف لحسابك.</li>
        <li>• بتاخد كود المشروب يوم الجمعة بس، وتديه للكاشير.</li>
        <li>• الكود صالح لنفس اليوم ولمرة واحدة، ومفيش استبدال نقدي.</li>
      </ul>
      <Gate soft>{me => <Mine me={me} />}</Gate>
    </main>);
}

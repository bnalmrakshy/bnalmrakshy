"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Gate, { Me } from "@/components/Gate";
import Hub from "@/components/Hub";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { LEVELS } from "@/lib/config";
import { sb, logout, ar } from "@/lib/supabase";
type D = { earned: number; points: number; visits: number; rank: number | null };
function Club({ me }: { me: Me }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    const [l, c, r] = await Promise.all([sb.from("points_ledger").select("delta,reason").eq("member_id", me.id), sb.from("checkins").select("day", { count: "exact", head: true }).eq("member_id", me.id), sb.rpc("my_rank")]);
    if (l.error || c.error || r.error) return setErr(true);
    setD({ earned: (l.data ?? []).filter((x: any) => x.reason === "invoice").reduce((a: number, x: any) => a + x.delta, 0), points: (l.data ?? []).reduce((a: number, x: any) => a + x.delta, 0), visits: c.count ?? 0, rank: r.data });
  }, [me.id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <main className="px-6 py-20">حصلت مشكلة في تحميل بياناتك. <button onClick={load} className="underline font-bold">جرّب تاني</button></main>;
  if (!d) return <main className="min-h-[60vh] grid place-items-center text-roast">لحظة...</main>;
  const lvl = [...LEVELS].reverse().find(l => d.earned >= l.min)!; const nxt = LEVELS.find(l => l.min > d.earned);
  return (
    <main className="mx-auto max-w-lg px-5 pt-5 pb-4 space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-espresso via-[#24160F] to-roast text-cream p-6">
        <div className="absolute -left-8 -top-8 opacity-10"><Logo size={170} /></div>
        <div className="relative flex items-center gap-4"><Link href="/profile" aria-label="تعديل حسابي"><span className="block rounded-full ring-4 ring-brass"><Avatar url={me.avatar_url} size={72} /></span></Link>
          <div className="min-w-0"><h1 className="text-2xl font-black truncate">{me.display_name}</h1><p className="text-sm text-cream/70 mt-0.5">مستوى {lvl.n}</p></div></div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 text-center">{[["نقطة", d.points], ["زيارة", d.visits], ["ترتيبك", d.rank ?? "–"]].map(([l, n]) => <div key={l as string} className="rounded-2xl bg-white/10 py-3"><div className="text-2xl font-black num">{typeof n === "number" ? ar(n) : n}</div><div className="text-xs text-cream/70">{l}</div></div>)}</div>
        <p className="relative mt-4 text-sm text-cream/80 num">رصيدك بيساوي <b className="text-white">{ar(Math.floor(d.points / 10))} جنيه</b></p>
      </div>
      {nxt && <div className="rounded-2xl bg-sand/60 p-4"><div className="flex justify-between text-sm font-bold"><span>{lvl.n}</span><span className="text-roast num">فاضل {ar(nxt.min - d.earned)} نقطة لـ{nxt.n}</span></div>
        <div className="h-2 rounded-full bg-white mt-3 overflow-hidden"><div className="h-full bg-brass" style={{ width: `${Math.min(100, ((d.earned - lvl.min) / (nxt.min - lvl.min)) * 100)}%` }} /></div></div>}
      <div className="grid grid-cols-2 gap-3"><Link href="/history" className="bg-espresso text-cream font-bold text-center py-4 active:scale-[.98]">محفظتي</Link><Link href="/profile" className="border border-espresso font-bold text-center py-4 active:scale-[.98]">تعديل حسابي</Link></div>
      <button onClick={logout} className="w-full text-sm text-roast py-2">تسجيل خروج</button>
    </main>);
}
export default function Page() { return <Gate>{me => me.role === "member" ? <Club me={me} /> : <Hub me={me} />}</Gate>; }

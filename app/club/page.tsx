"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Gate, { Me } from "@/components/Gate";
import Hub from "@/components/Hub";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { sb, logout, ar } from "@/lib/supabase";
type D = { points: number; visits: number; rank: number | null; target: number; days: string[]; pending: number };
function Club({ me }: { me: Me }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    const [l, c, r, s, f] = await Promise.all([
      sb.from("points_ledger").select("delta").eq("member_id", me.id),
      sb.from("checkins").select("day", { count: "exact" }).eq("member_id", me.id).order("day", { ascending: false }).limit(10),
      sb.rpc("my_rank"), sb.from("app_settings").select("streak_target").single(),
      sb.from("free_drinks").select("id", { count: "exact", head: true }).eq("member_id", me.id).is("used_at", null)]);
    if (l.error || c.error || r.error || s.error || f.error) return setErr(true);
    setD({ points: (l.data ?? []).reduce((a, x) => a + x.delta, 0), visits: c.count ?? 0, rank: r.data, target: s.data!.streak_target, days: (c.data ?? []).map(x => x.day), pending: f.count ?? 0 });
  }, [me.id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <main className="px-6 py-20"><p>حصلت مشكلة في تحميل بياناتك.</p><button onClick={load} className="underline font-bold mt-3">جرّب تاني</button></main>;
  if (!d) return <main className="min-h-[60vh] grid place-items-center text-roast">بنحمّل حسابك...</main>;
  return (
    <main>
      <section className="px-5 pt-6 max-w-lg mx-auto">
        <div className="rounded-3xl bg-espresso text-cream p-6 relative overflow-hidden">
          <div className="absolute -left-8 -top-8 opacity-10"><Logo size={170} /></div>
          <div className="flex items-center gap-4 relative">
            <Link href="/profile" aria-label="تعديل حسابي"><span className="block rounded-full ring-4 ring-brass"><Avatar url={me.avatar_url} size={84} /></span></Link>
            <div className="min-w-0"><h1 className="text-2xl font-black truncate">{me.display_name}</h1>
              <div className="mt-1.5 flex flex-wrap gap-2 items-center"><span className="text-xs bg-white/10 rounded-full px-3 py-1" dir="ltr">@{me.username}</span>
                <span className="text-xs bg-brass text-espresso font-black rounded-full px-3 py-1">{d.visits >= 20 ? "من أهل البيت" : d.visits >= 5 ? "زبون ثابت" : "ضيف جديد"}</span></div></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6 relative">
            {[["نقطة", d.points], ["زيارة", d.visits], ["ترتيبك", d.rank ?? "–"]].map(([l, n]) => <div key={l as string} className="rounded-2xl bg-white/10 py-3 text-center"><div className="text-3xl font-black num">{typeof n === "number" ? ar(n) : n}</div><div className="text-xs text-cream/70 mt-0.5">{l}</div></div>)}
          </div>
        </div>
      </section>
      <section className="px-6 py-10 md:px-16 max-w-xl">
        <h2 className="text-xl font-black">الستريك: {ar(me.streak)} من {ar(d.target)}</h2>
        <div className="flex gap-2 mt-4" dir="ltr">{Array.from({ length: d.target }).map((_, i) => <span key={i} className={`w-8 h-8 rounded-full border ${i < me.streak ? "bg-brass border-brass" : "border-roast/30"}`} />)}</div>
        {d.pending > 0 && <Link href="/rewards" className="block mt-6 bg-brass text-espresso font-bold p-4">عندك {ar(d.pending)} مشروب مجاني مستني، يوم الجمعة تاخد كوده ←</Link>}
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/scan" className="bg-espresso text-cream font-bold text-center py-4 active:scale-[.98]">امسح كود الفاتورة</Link>
          <Link href="/profile" className="border border-espresso text-center py-3 font-bold">تعديل حسابي</Link>
          <Link href="/history" className="border border-espresso text-center py-3 font-bold">سجل المشتريات</Link>
          {me.role !== "member" && <Link href="/staff" className="border border-espresso text-center py-3 font-bold">تأكيد مشروب الجمعة</Link>}
          {me.role === "admin" && <Link href="/admin" className="border border-espresso text-center py-3 font-bold">الإدارة وتوليد كود التسجيل</Link>}
        </div>
        <h2 className="text-xl font-black mt-10">آخر زياراتك</h2>
        {d.days.length === 0 ? <p className="mt-3 text-roast">لسه مسجلتش زيارة. امسح كود الكاشير أول ما تيجي.</p> :
          <ul className="mt-3">{d.days.map(x => <li key={x} className="py-3 border-b border-sand num" dir="ltr" style={{ textAlign: "right" }}>{x}</li>)}</ul>}
        <button onClick={logout} className="mt-10 text-sm underline text-roast">تسجيل خروج</button>
      </section>
    </main>);
}
export default function Page() { return <Gate>{me => me.role === "member" ? <Club me={me} /> : <Hub me={me} />}</Gate>; }

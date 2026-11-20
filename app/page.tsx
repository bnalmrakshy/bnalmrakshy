"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Counter from "@/components/Counter";
import Icon from "@/components/Icons";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Sk from "@/components/Skeleton";
import StreakCups from "@/components/StreakCups";
import { sb, ar } from "@/lib/supabase";
type Me = { display_name: string; role: string; streak: number };
const SLIDES = [
  { t: "٧ أيام ورا بعض", s: "مشروب الجمعة علينا", href: "/rewards", c: "bg-espresso text-cream" },
  { t: "كل طلب بيجمعلك نقط", s: "والنقطة بجنيه", href: "/menu", c: "bg-roast text-cream" },
  { t: "شوف المنيو", s: "واعرف باقيلك كام نقطة", href: "/menu", c: "bg-sand text-espresso" },
];
const ACTIONS = [["/menu", "المنيو", "cup"], ["/scan", "امسح فاتورة", "qr"], ["/leaderboard", "المتصدرين", "trophy"], ["/history", "مشترياتي", "receipt"]] as const;
const greet = () => { const h = +new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }).format(new Date()); return h < 12 ? "صباح الخير" : h < 18 ? "نهارك سعيد" : "مساء الخير"; };
export default function Home() {
  const [me, setMe] = useState<Me | null>(null); const [pts, setPts] = useState(0); const [target, setTarget] = useState(7); const [ready, setReady] = useState(false);
  const [top, setTop] = useState<{ display_name: string; points: number }[] | null>(null); const [i, setI] = useState(0);
  useEffect(() => { (async () => {
    sb.rpc("get_leaderboard", { period: "all", lim: 5 }).then(r => setTop(r.data ?? []));
    sb.from("app_settings").select("streak_target").single().then(r => r.data && setTarget(r.data.streak_target));
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const p = await sb.from("profiles").select("display_name,role,streak").eq("id", session.user.id).single(); if (p.data) setMe(p.data);
      const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0));
    }
    setReady(true);
  })(); }, []);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 4200); return () => clearInterval(t); }, []);
  const sl = SLIDES[i]; const staff = me && me.role !== "member";
  return (
    <main className="mx-auto max-w-lg px-5 pt-5 space-y-6">
      {ready && (me ? <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-roast mb-2">{greet()}، {me.display_name}</p>
        {staff ? <Link href="/club" className="block rounded-3xl bg-espresso text-cream p-6 active:scale-[.98] transition"><p className="text-xl font-black">لوحة الإدارة</p><p className="text-cream/60 text-sm mt-1">فاتورة جديدة · الأعضاء · المنيو</p></Link>
          : <div className="rounded-3xl bg-espresso text-cream p-6 relative overflow-hidden">
            <div className="absolute -left-6 -bottom-6 opacity-10"><Logo size={150} /></div>
            <p className="text-cream/60 text-sm">رصيدك</p>
            <p className="text-6xl font-black leading-tight"><Counter to={pts} /> <span className="text-lg font-bold text-brass">نقطة</span></p>
            <div className="mt-5"><StreakCups count={me.streak} target={target} /></div>
            <p className="text-xs text-cream/60 mt-2">ستريك {ar(me.streak)} من {ar(target)}</p></div>}
      </motion.section> : <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-espresso text-cream p-6 relative overflow-hidden">
        <div className="absolute -left-6 -bottom-6 opacity-10"><Logo size={150} /></div>
        <p className="text-2xl font-black leading-snug">كل زيارة بتقرّبك<br />من مشروبك.</p>
        <div className="flex gap-3 mt-6"><Link href="/register" className="flex-1 bg-brass text-espresso font-black text-center py-3.5 active:scale-[.97] transition">ابدأ</Link><Link href="/login" className="flex-1 border border-cream/30 font-bold text-center py-3.5 active:scale-[.97] transition">دخول</Link></div>
      </motion.section>)}

      <section>
        <AnimatePresence mode="wait"><motion.div key={i} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: .3 }}>
          <Link href={sl.href} className={`block rounded-3xl p-6 h-32 relative overflow-hidden ${sl.c}`}>
            <div className="absolute -left-4 -top-4 opacity-10"><Logo size={120} /></div>
            <p className="text-2xl font-black">{sl.t}</p><p className="mt-1 opacity-70">{sl.s}</p></Link></motion.div></AnimatePresence>
        <div className="flex justify-center gap-1.5 mt-3">{SLIDES.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`بانر ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-espresso" : "w-1.5 bg-roast/25"}`} />)}</div>
      </section>

      <section className="grid grid-cols-4 gap-3">{ACTIONS.map(([h, l, ic]) => (
        <Link key={h} href={h} className="rounded-2xl bg-sand py-4 flex flex-col items-center gap-2 text-[11px] font-bold text-center active:scale-95 transition"><Icon name={ic} size={26} />{l}</Link>))}</section>

      <section>
        <div className="flex items-center justify-between mb-3"><h2 className="font-black text-lg">المتصدرين</h2><Link href="/leaderboard" className="text-sm text-roast underline">الكل</Link></div>
        {top === null ? <Sk className="h-52" /> : top.length === 0 ? <p className="rounded-2xl bg-sand p-5 text-roast">لسه مفيش حد. كن الأول.</p> :
          <ol className="rounded-2xl bg-sand overflow-hidden">{top.map((r, k) => (
            <li key={k} className="flex items-center gap-3 px-4 py-3.5 border-b border-white last:border-0"><span className={`w-8 h-8 rounded-full grid place-items-center text-sm font-black num ${k === 0 ? "bg-espresso text-cream" : "bg-white"}`}>{ar(k + 1)}</span>
              <span className="flex-1 font-bold">{r.display_name}</span><span className="num text-sm text-roast">{ar(r.points)}</span></li>))}</ol>}
      </section>
      <Footer />
    </main>);
}

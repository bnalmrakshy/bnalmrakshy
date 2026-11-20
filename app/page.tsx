"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Counter from "@/components/Counter";
import { sb } from "@/lib/supabase";
type Row = { display_name: string; points: number };
const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: .5, ease: "easeOut" } } as const;
export default function Home() {
  const [top, setTop] = useState<Row[] | null>(null); const [st, setSt] = useState<{ members: number; visits: number; target: number } | null>(null);
  useEffect(() => { sb.rpc("get_leaderboard", { period: "all", lim: 5 }).then(r => setTop(r.data ?? [])); sb.rpc("get_stats").then(r => setSt(r.data)); }, []);
  const T = st?.target ?? 7;
  return (
    <main>
      <section className="bg-espresso text-cream grain px-6 pt-14 pb-16 md:px-16 md:pt-24">
        <motion.div {...rise} className="max-w-xl">
          <p className="text-brass text-sm font-bold">المراكشي ستريك</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.25] font-black md:text-6xl">كل زيارة<br />بتقرّبك من مشروبك.</h1>
          <p className="mt-5 text-cream/75 leading-8">زورنا {T.toLocaleString("ar-EG")} أيام ورا بعض، ومشروبك يوم الجمعة علينا.</p>
          <div className="mt-8 flex gap-3">
            <Link href="/register" className="bg-brass text-espresso font-bold px-7 py-4 active:scale-[.97] transition">ابدأ الستريك</Link>
            <Link href="/login" className="border border-cream/30 px-6 py-4 font-semibold active:scale-[.97] transition">دخول</Link>
          </div>
        </motion.div>
      </section>
      <section className="px-6 py-10 grid grid-cols-2 gap-4 border-b border-sand md:px-16 max-w-3xl">
        {[["عضو", st?.members], ["زيارة الشهر ده", st?.visits]].map(([l, n]) => (
          <div key={l as string}><div className="text-3xl font-black text-roast">{n == null ? "–" : <Counter to={n as number} />}</div><div className="text-xs text-roast/70 mt-1">{l}</div></div>
        ))}
      </section>
      <section className="px-6 py-12 md:px-16 max-w-3xl">
        <div className="flex items-baseline justify-between"><h2 className="text-2xl font-black">المتصدرين</h2><Link href="/leaderboard" className="text-sm text-caramel font-semibold">القايمة كلها</Link></div>
        {top === null ? <p className="mt-6 text-roast/60">بنحمّل القايمة...</p> : top.length === 0 ? <p className="mt-6 text-roast leading-8">لسه مفيش حد على القايمة. كن إنت الأول.</p> : (
          <ol className="mt-6">{top.map((r, i) => (
            <motion.li key={i} {...rise} transition={{ duration: .4, delay: i * .05 }} className={`flex items-center gap-4 py-4 border-b border-sand ${i < 3 ? "font-black" : "font-semibold"}`}>
              <span className={`w-8 text-2xl num ${i === 0 ? "text-brass" : i < 3 ? "text-caramel" : "text-roast/40"}`}>{(i + 1).toLocaleString("ar-EG")}</span>
              <span className="flex-1">{r.display_name}</span><span className="num">{r.points.toLocaleString("ar-EG")}</span>
            </motion.li>))}</ol>)}
      </section>
      <section className="bg-sand/60 px-6 py-12 md:px-16">
        <h2 className="text-2xl font-black">الجمعة علينا</h2>
        <div className="flex gap-2 mt-6" dir="ltr">{Array.from({ length: T }).map((_, i) => (
          <motion.span key={i} initial={{ scale: .5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * .08 }} className="w-8 h-8 rounded-full bg-brass" />))}</div>
        <p className="mt-5 leading-8 max-w-md">{T.toLocaleString("ar-EG")} أيام ورا بعض = مشروب مجاني. بتستلمه يوم الجمعة بس. لو فوّتّ يوم، الستريك بيبدأ من الأول.</p>
      </section>
      <section className="px-6 py-12 md:px-16 max-w-3xl">
        <h2 className="text-2xl font-black">إزاي بتشتغل؟</h2>
        <ol className="mt-6 space-y-6">
          {["اعمل حساب في دقيقة: اسم، يوزر، وباسورد.", "لما تيجي المحل، الكاشير يفتح التسجيل وإنت تمسح الكود بكاميرا موبايلك.", "تظهرلك زيارتك ونقاطك على طول، والستريك يكبر كل يوم."].map((t, i) => (
            <li key={i} className="flex gap-4"><span className="text-4xl font-black text-brass/60 num">{(i + 1).toLocaleString("ar-EG")}</span><p className="pt-2 leading-7">{t}</p></li>))}
        </ol>
      </section>
    </main>
  );
}

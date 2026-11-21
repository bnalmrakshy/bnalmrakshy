"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import Counter from "@/components/Counter";
import CupArt from "@/components/CupArt";
import Icon from "@/components/Icons";
import ItemArt from "@/components/ItemArt";
import Sk from "@/components/Skeleton";
import StreakCups from "@/components/StreakCups";
import { sb, ar } from "@/lib/supabase";
type Me = { display_name: string; role: string; streak: number };
type Row = { rk: number; display_name: string; points: number; is_me: boolean; avatar_url: string | null };
type It = { id: number; name: string; category: string; price: number };
const greet = () => { const h = +new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }).format(new Date()); return h < 12 ? "صباح الخير" : h < 18 ? "نهارك سعيد" : "مساء الخير"; };
const rise = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * .08, duration: .5, ease: "easeOut" as const } });
const ACTIONS = [["/menu", "المنيو", "اختار مشروبك", "cup"], ["/scan", "امسح فاتورة", "واكسب نقاطك", "qr"], ["/leaderboard", "الدوري", "نافس واطلع", "trophy"], ["/history", "محفظتي", "نقاطك وسجلك", "wallet"]] as const;
const STEPS = [["اطلب من الكاشير", "زي كل مرة، من غير أي خطوة زيادة."], ["امسح الـ QR", "الكاشير هيطلّعلك كود الفاتورة، صوّره من التطبيق."], ["اكسب واستبدل", "كل ١٠ نقط = ١ جنيه تخصمهم من أي فاتورة."]];
export default function Home() {
  const [me, setMe] = useState<Me | null>(null); const [pts, setPts] = useState(0); const [target, setTarget] = useState(7); const [ready, setReady] = useState(false);
  const [top, setTop] = useState<Row[] | null>(null); const [pop, setPop] = useState<It[]>([]);
  useEffect(() => { (async () => {
    sb.rpc("get_league", { period: "week", lim: 5 }).then(r => setTop(r.data ?? []));
    sb.from("app_settings").select("streak_target").single().then(r => r.data && setTarget(r.data.streak_target));
    sb.rpc("popular_items", { lim: 10 }).then(async r => { if (!r.error && r.data?.length) setPop(r.data); else { const m = await sb.from("menu_items").select("id,name,category,price").order("id").limit(10); setPop(m.data ?? []); } });
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const p = await sb.from("profiles").select("display_name,role,streak").eq("id", session.user.id).single(); if (p.data) setMe(p.data);
      const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0));
    }
    setReady(true);
  })(); }, []);
  const staff = !!me && me.role !== "member";
  return (
    <main className="mx-auto max-w-6xl px-5 lg:px-8 pt-5 pb-2 space-y-5">
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.section {...rise(0)} className="lg:col-span-2 relative overflow-hidden rounded-[2rem] text-cream p-6 lg:p-9 min-h-[320px] bg-gradient-to-br from-espresso via-[#24160F] to-roast">
          <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
          <div className="absolute -left-3 -bottom-2 w-44 lg:w-72 pointer-events-none opacity-95"><CupArt /></div>
          <div className="relative max-w-[64%] lg:max-w-[58%] min-h-[270px] flex flex-col justify-center">
            {!ready ? <Sk className="h-40 bg-white/10" /> : staff ? <>
              <p className="text-brass text-sm font-bold">{greet()}، {me!.display_name}</p><h1 className="mt-2 text-3xl lg:text-5xl font-black leading-tight">لوحة الإدارة</h1>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/pos" className="bg-white text-espresso font-black px-5 py-3 active:scale-95 transition">الكاشير</Link><Link href="/club" className="border border-white/30 font-bold px-5 py-3 active:scale-95 transition">المكتب</Link></div></>
              : me ? <>
              <p className="text-brass text-sm font-bold">{greet()}، {me.display_name}</p>
              <p className="mt-1 text-5xl lg:text-7xl font-black leading-none"><Counter to={pts} /></p><p className="text-lg font-bold text-brass mt-1">نقطة</p>
              <p className="mt-2 text-sm text-cream/70 num">بتساوي <b className="text-white">{ar(Math.floor(pts / 10))} جنيه</b> خصم · كل ١٠ نقط بجنيه</p>
              <div className="mt-4"><StreakCups count={Math.min(me.streak, target)} target={target} /></div>
              <div className="mt-5 flex flex-wrap gap-3"><Link href="/menu" className="bg-white text-espresso font-black px-5 py-3 active:scale-95 transition">المنيو</Link><Link href="/scan" className="border border-white/30 font-bold px-5 py-3 active:scale-95 transition">امسح فاتورة</Link></div></> : <>
              <p className="text-brass text-sm font-bold">المراكشي</p><h1 className="mt-2 text-4xl lg:text-6xl font-black leading-[1.15]">قهوتك<br />بتكسّبك.</h1>
              <p className="mt-3 text-cream/75 text-sm lg:text-base leading-7">كل طلب بيجمعلك نقط، وكل ١٠ نقط = ١ جنيه خصم.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/register" className="bg-white text-espresso font-black px-6 py-3 active:scale-95 transition">ابدأ مجانًا</Link><Link href="/login" className="border border-white/30 font-bold px-6 py-3 active:scale-95 transition">دخول</Link></div></>}
          </div>
        </motion.section>
        <motion.section {...rise(1)} className="rounded-[2rem] bg-sand/70 p-5">
          <div className="flex items-center justify-between"><h2 className="font-black text-lg flex items-center gap-2"><Icon name="trophy" size={20} />دوري الأسبوع</h2><Link href="/leaderboard" className="text-sm font-bold underline">الكل</Link></div>
          {top === null ? <div className="mt-4 space-y-2"><Sk className="h-12 bg-white" /><Sk className="h-12 bg-white" /><Sk className="h-12 bg-white" /></div> : top.length === 0 ? <p className="mt-4 text-sm text-roast leading-7">الدوري لسه فاضي. أول فاتورة تحطك في الصدارة.</p> :
            <ol className="mt-4 space-y-2">{top.map((r, k) => <li key={k} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${k === 0 ? "bg-espresso text-cream" : r.is_me ? "bg-white ring-2 ring-brass" : "bg-white"}`}>
              <span className="w-5 text-center font-black num text-sm">{ar(r.rk)}</span><Avatar url={r.avatar_url} size={32} /><span className="flex-1 font-bold text-sm truncate">{r.display_name}</span><span className="text-xs num opacity-70">{ar(r.points)}</span></li>)}</ol>}
        </motion.section>
      </div>

      {pop.length > 0 && <motion.section {...rise(2)}><h2 className="font-black text-lg flex items-center gap-2 mb-3"><Icon name="flame" size={20} />الناس بتطلب إيه</h2>
        <div dir="ltr" className="overflow-hidden rounded-3xl [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"><div className="marquee flex gap-3 w-max">{[...pop, ...pop].map((i, k) => (
          <Link key={k} href="/menu" className="flex items-center gap-3 rounded-2xl bg-sand/70 pr-5 pl-2 py-2 shrink-0" dir="rtl"><ItemArt name={i.name} cat={i.category} size={48} /><span><span className="block font-black text-sm whitespace-nowrap">{i.name}</span><span className="block text-xs text-roast num">{ar(i.price)} ج</span></span></Link>))}</div></div></motion.section>}

      <motion.section {...rise(3)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">{ACTIONS.map(([h, l, s, ic]) => (
        <Link key={h} href={h} className="rounded-3xl bg-sand/70 p-4 active:scale-95 hover:shadow-md transition flex flex-col gap-3"><span className="w-12 h-12 rounded-2xl bg-espresso text-cream grid place-items-center"><Icon name={ic} size={24} /></span><span><span className="block font-black">{l}</span><span className="block text-xs text-roast">{s}</span></span></Link>))}</motion.section>

      <motion.section {...rise(4)} className="rounded-[2rem] border border-sand p-5 lg:p-8"><h2 className="font-black text-lg lg:text-2xl">إزاي بتكسب؟</h2>
        <ol className="mt-5 grid lg:grid-cols-3 gap-5">{STEPS.map(([t, s], i) => <li key={i} className="flex gap-4"><span className="w-11 h-11 shrink-0 rounded-full bg-espresso text-cream grid place-items-center font-black num">{ar(i + 1)}</span><span><span className="block font-black">{t}</span><span className="block text-sm text-roast leading-6 mt-0.5">{s}</span></span></li>)}</ol></motion.section>
    </main>);
}

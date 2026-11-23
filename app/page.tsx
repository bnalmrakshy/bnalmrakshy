"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import Counter from "@/components/Counter";
import CupArt from "@/components/CupArt";
import Icon from "@/components/Icons";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type Me = { display_name: string; role: string };
type Row = { rk: number; display_name: string; points: number; is_me: boolean; avatar_url: string | null };
const greet = () => { const h = +new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }).format(new Date()); return h < 12 ? "صباح الخير" : h < 18 ? "نهارك سعيد" : "مساء الخير"; };
const ACTIONS = [["/menu", "المنيو", "cup"], ["/scan", "امسح فاتورة", "qr"], ["/history", "محفظتي", "wallet"], ["/order", "اطلب توصيل", "cart"]] as const;
export default function Home() {
  const [me, setMe] = useState<Me | null>(null); const [pts, setPts] = useState(0); const [ready, setReady] = useState(false); const [top, setTop] = useState<Row[] | null>(null);
  useEffect(() => { (async () => {
    sb.rpc("get_league", { period: "week", lim: 3 }).then(r => setTop(r.data ?? []));
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const p = await sb.from("profiles").select("display_name,role").eq("id", session.user.id).single(); if (p.data) setMe(p.data);
      const l = await sb.from("points_ledger").select("delta").eq("member_id", session.user.id); setPts((l.data ?? []).reduce((a, x) => a + x.delta, 0));
    }
    setReady(true);
  })(); }, []);
  const staff = !!me && me.role !== "member";
  return (
    <main className="mx-auto max-w-5xl px-5 lg:px-8 pt-5 pb-2 space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 relative overflow-hidden rounded-[2rem] text-cream p-6 lg:p-8 min-h-[250px] bg-gradient-to-br from-espresso via-[#24160F] to-roast">
          <div className="absolute inset-0 grain opacity-60 pointer-events-none" /><div className="absolute -left-3 -bottom-2 w-36 lg:w-56 pointer-events-none"><CupArt /></div>
          <div className="relative max-w-[62%] min-h-[200px] flex flex-col justify-center">
            {!ready ? <Sk className="h-32 bg-white/10" /> : staff ? <>
              <p className="text-brass text-sm font-bold">{greet()}، {me!.display_name}</p><h1 className="mt-1 text-3xl font-black">أهلًا بيك</h1>
              <div className="mt-5 flex flex-wrap gap-3"><Link href="/pos" className="bg-white text-espresso font-black px-5 py-3">الكاشير</Link><Link href="/club" className="border border-white/30 font-bold px-5 py-3">حسابي</Link></div></>
              : me ? <>
              <p className="text-brass text-sm font-bold">{greet()}، {me.display_name}</p>
              <p className="mt-1 text-5xl lg:text-6xl font-black leading-none"><Counter to={pts} /></p><p className="text-brass font-bold mt-1">نقطة</p>
              <p className="mt-1 text-sm text-cream/70 num">= {ar(Math.floor(pts / 10))} جنيه خصم</p>
              <div className="mt-5"><Link href="/menu" className="inline-block bg-white text-espresso font-black px-5 py-3 active:scale-95 transition">شوف المنيو</Link></div></> : <>
              <h1 className="text-4xl lg:text-5xl font-black leading-[1.15]">قهوتك<br />بتكسّبك.</h1>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/register" className="bg-white text-espresso font-black px-6 py-3 active:scale-95 transition">ابدأ</Link><Link href="/login" className="border border-white/30 font-bold px-6 py-3 active:scale-95 transition">دخول</Link></div></>}
          </div>
        </motion.section>
        <section className="rounded-[2rem] bg-sand/70 p-5">
          <div className="flex items-center justify-between"><h2 className="font-black">دوري الأسبوع</h2><Link href="/leaderboard" className="text-sm font-bold underline">الكل</Link></div>
          {top === null ? <Sk className="mt-4 h-32 bg-white" /> : top.length === 0 ? <p className="mt-4 text-sm text-roast">لسه فاضي. أول فاتورة تحطك في الصدارة.</p> :
            <ol className="mt-4 space-y-2">{top.map(r => <li key={r.rk} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.rk === 1 ? "bg-espresso text-cream" : "bg-white"}`}><span className="w-5 text-center font-black num text-sm">{ar(r.rk)}</span><Avatar url={r.avatar_url} size={32} /><span className="flex-1 font-bold text-sm truncate">{r.display_name}</span></li>)}</ol>}
        </section>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{ACTIONS.map(([h, l, ic]) => (
        <Link key={h} href={h} className="rounded-3xl bg-sand/70 py-5 flex flex-col items-center gap-2 font-bold text-sm active:scale-95 transition"><span className="w-12 h-12 rounded-2xl bg-espresso text-cream grid place-items-center"><Icon name={ic} size={24} /></span>{l}</Link>))}</div>
    </main>);
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type Row = { rk: number; display_name: string; points: number; visits: number; is_me: boolean; avatar_url: string | null };
const P = [["week", "دوري الأسبوع"], ["month", "دوري الشهر"], ["all", "الكل"]];
const POD = [{ i: 1, h: 96, c: "bg-roast text-cream" }, { i: 0, h: 128, c: "bg-espresso text-cream" }, { i: 2, h: 76, c: "bg-sand text-espresso" }];
export default function LB() {
  const [p, setP] = useState("week"); const [lim, setLim] = useState(10); const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { let ok = true; setRows(null); setErr(false);
    sb.rpc("get_league", { period: p, lim }).then(r => { if (ok) r.error ? setErr(true) : setRows(r.data); }); return () => { ok = false; }; }, [p, lim, n]);
  const pod = !!rows && rows.length >= 3; const rest = rows ? (pod ? rows.slice(3) : rows) : [];
  const mi = rows ? rows.findIndex(r => r.is_me) : -1; const me = mi >= 0 ? rows![mi] : null; const prev = mi > 0 ? rows![mi - 1] : null;
  return (
    <main className="mx-auto max-w-lg lg:max-w-3xl px-5 pt-5 pb-4">
      <h1 className="text-3xl font-black">الدوري</h1><p className="text-roast text-sm mt-1">كل فاتورة بتطلّعك. نافس واوصل للقمة.</p>
      <div className="mt-4 flex gap-1 p-1 rounded-2xl bg-sand">{P.map(([k, l]) => <button key={k} onClick={() => setP(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${p === k ? "bg-espresso text-cream" : "text-roast"}`}>{l}</button>)}</div>
      {err ? <p className="mt-8">مقدرناش نحمّل الدوري. <button className="underline font-bold" onClick={() => setN(n + 1)}>جرّب تاني</button></p>
        : rows === null ? <div className="mt-6 space-y-3"><Sk className="h-40" />{[0, 1, 2].map(k => <Sk key={k} className="h-14" />)}</div>
        : rows.length === 0 ? <p className="mt-8 rounded-2xl bg-sand p-5 leading-7">الدوري لسه فاضي. أول فاتورة تحطك في الصدارة.</p>
        : <>
          {me ? <div className="mt-5 rounded-2xl bg-espresso text-cream p-4 text-sm leading-7"><b className="text-lg num">إنت رقم {ar(me.rk)}</b><br />{prev ? `فاضل ${ar(prev.points - me.points + 1)} نقطة وتعدّي ${prev.display_name}.` : "إنت في الصدارة. حافظ عليها."}</div>
            : <Link href="/register" className="mt-5 block rounded-2xl bg-sand p-4 text-sm font-bold">سجّل وادخل المنافسة ←</Link>}
          {pod && <div className="mt-8 flex items-end justify-center gap-2" dir="ltr">{POD.map(({ i, h, c }) => (
            <div key={i} className="flex-1 text-center min-w-0 flex flex-col items-center">
              <Avatar url={rows[i].avatar_url} size={52} /><p className={`mt-2 font-black text-sm truncate max-w-full px-1 ${rows[i].is_me ? "text-brass" : ""}`}>{rows[i].display_name}</p><p className="text-xs text-roast num mb-2">{ar(rows[i].points)} نقطة</p>
              <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: .6, ease: "easeOut", delay: .1 * i }} className={`w-full rounded-t-2xl grid place-items-center overflow-hidden ${c}`}><span className="text-3xl font-black num">{ar(rows[i].rk)}</span></motion.div>
            </div>))}</div>}
          <ol className="mt-6 space-y-2">{rest.map((r, k) => (
            <motion.li key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 8) * .04 }} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${r.is_me ? "bg-espresso text-cream" : "bg-sand/60"}`}>
              <span className="w-8 text-center font-black num">{ar(r.rk)}</span><Avatar url={r.avatar_url} size={36} />
              <span className="flex-1 font-bold truncate">{r.display_name}</span><span className="text-xs opacity-70 num">{ar(r.visits)} فاتورة</span><span className="num font-black w-14 text-left">{ar(r.points)}</span>
            </motion.li>))}</ol></>}
      <div className="mt-8 flex justify-center gap-5 text-sm">{[10, 50, 100].map(l => <button key={l} onClick={() => setLim(l)} className={lim === l ? "font-black underline" : "text-roast"}>أفضل {ar(l)}</button>)}</div>
    </main>);
}

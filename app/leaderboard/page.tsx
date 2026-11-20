"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
type Row = { display_name: string; points: number; visits: number };
const P = [["week", "الأسبوع"], ["month", "الشهر"], ["all", "الكل"]];
const POD = [{ i: 1, h: 96, c: "bg-roast text-cream", n: "٢" }, { i: 0, h: 128, c: "bg-espresso text-cream", n: "١" }, { i: 2, h: 76, c: "bg-sand text-espresso", n: "٣" }];
export default function LB() {
  const [p, setP] = useState("week"); const [lim, setLim] = useState(10); const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { let ok = true; setRows(null); setErr(false);
    sb.rpc("get_leaderboard", { period: p, lim }).then(r => { if (ok) r.error ? setErr(true) : setRows(r.data); }); return () => { ok = false; }; }, [p, lim, n]);
  const pod = rows && rows.length >= 3; const rest = rows ? (pod ? rows.slice(3) : rows) : [];
  return (
    <main className="mx-auto max-w-lg px-5 pt-5 pb-4">
      <h1 className="text-2xl font-black">المتصدرين</h1>
      <div className="mt-4 flex gap-1 p-1 rounded-2xl bg-sand">{P.map(([k, l]) => <button key={k} onClick={() => setP(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${p === k ? "bg-espresso text-cream" : "text-roast"}`}>{l}</button>)}</div>
      {err ? <p className="mt-8">مقدرناش نحمّل القايمة. <button className="underline font-bold" onClick={() => setN(n + 1)}>جرّب تاني</button></p>
        : rows === null ? <div className="mt-6 space-y-3"><Sk className="h-40" />{[0, 1, 2].map(k => <Sk key={k} className="h-14" />)}</div>
        : rows.length === 0 ? <p className="mt-8 rounded-2xl bg-sand p-5 leading-7">القايمة فاضية في الفترة دي. أول فاتورة تحطك في الصدارة.</p>
        : <>
          {pod && <div className="mt-8 flex items-end justify-center gap-2" dir="ltr">{POD.map(({ i, h, c, n: rank }) => (
            <div key={i} className="flex-1 text-center min-w-0">
              <p className="font-black text-sm truncate px-1">{rows[i].display_name}</p><p className="text-xs text-roast num mb-2">{ar(rows[i].points)} نقطة</p>
              <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: .6, ease: "easeOut", delay: .1 * i }} className={`rounded-t-2xl grid place-items-center overflow-hidden ${c}`}><span className="text-3xl font-black">{rank}</span></motion.div>
            </div>))}</div>}
          <ol className="mt-6 space-y-2">{rest.map((r, k) => { const rank = (pod ? 3 : 0) + k + 1; return (
            <motion.li key={rank} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 8) * .04 }} className="flex items-center gap-3 rounded-2xl bg-sand/60 px-4 py-3.5">
              <span className="w-8 h-8 rounded-full bg-white grid place-items-center text-sm font-black num">{ar(rank)}</span>
              <span className="flex-1 font-bold truncate">{r.display_name}</span><span className="text-xs text-roast num">{ar(r.visits)} زيارة</span><span className="num font-black w-14 text-left">{ar(r.points)}</span>
            </motion.li>); })}</ol></>}
      <div className="mt-8 flex justify-center gap-5 text-sm">{[10, 50, 100].map(l => <button key={l} onClick={() => setLim(l)} className={lim === l ? "font-black underline" : "text-roast"}>أفضل {ar(l)}</button>)}</div>
    </main>);
}

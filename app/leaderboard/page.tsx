"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb, ar } from "@/lib/supabase";
type Row = { display_name: string; points: number; visits: number };
const P = [["week", "الأسبوع"], ["month", "الشهر"], ["all", "الكل"]];
export default function LB() {
  const [p, setP] = useState("week"); const [lim, setLim] = useState(10); const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { let ok = true; setRows(null); setErr(false);
    sb.rpc("get_leaderboard", { period: p, lim }).then(r => { if (ok) r.error ? setErr(true) : setRows(r.data); }); return () => { ok = false; }; }, [p, lim, n]);
  const tab = (a: boolean) => `px-4 py-2 font-bold border-b-2 ${a ? "border-brass text-espresso" : "border-transparent text-roast/60"}`;
  return (
    <main className="px-6 py-12 md:px-16 max-w-3xl">
      <h1 className="text-4xl font-black">أصحاب المقام</h1>
      <div className="flex gap-1 mt-6">{P.map(([k, l]) => <button key={k} onClick={() => setP(k)} className={tab(p === k)}>{l}</button>)}</div>
      {err ? <p className="mt-8">مقدرناش نحمّل القايمة. <button className="underline font-bold" onClick={() => setN(n + 1)}>جرّب تاني</button></p>
        : rows === null ? <p className="mt-8 text-roast/60">بنحمّل...</p>
        : rows.length === 0 ? <p className="mt-8 leading-8">القايمة فاضية في الفترة دي. أول زيارة تحطك في الصدارة.</p>
        : <ol className="mt-4">{rows.map((r, i) => (
          <motion.li layout key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * .03 }} className={`flex items-center gap-4 py-4 border-b border-sand ${i < 3 ? "font-black" : "font-semibold"}`}>
            <span className={`w-8 text-2xl num ${i === 0 ? "text-brass" : i < 3 ? "text-caramel" : "text-roast/40"}`}>{ar(i + 1)}</span>
            <span className="flex-1">{r.display_name}</span><span className="text-xs text-roast/60 num">{ar(r.visits)} زيارة</span><span className="num w-16 text-left">{ar(r.points)}</span>
          </motion.li>))}</ol>}
      <div className="mt-8 flex gap-4 text-sm">{[10, 50, 100].map(l => <button key={l} onClick={() => setLim(l)} className={lim === l ? "font-black underline" : "text-roast"}>أفضل {ar(l)}</button>)}</div>
    </main>);
}

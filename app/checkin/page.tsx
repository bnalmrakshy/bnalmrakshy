"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Counter from "@/components/Counter";
import StreakCups from "@/components/StreakCups";
import { sb, ar } from "@/lib/supabase";
type P = { status?: string; total: number; points: number; balance: number; lines: { name: string; qty: number; price: number }[] };
type R = { total: number; discount: number; paid: number; earned: number; streak: number; target: number; drink: boolean };
const MSG: Record<string, string> = {
  "invalid invoice": "الفاتورة دي مش صالحة أو انتهت. اطلب من الكاشير فاتورة جديدة.",
  "already claimed": "الفاتورة دي اتسجّلت قبل كده.",
  "not a member": "حسابات الكاشير والإدارة مبتجمعش نقاط. سجّل بحساب عضو.",
};
const why = (m: string) => MSG[Object.keys(MSG).find(k => m.includes(k)) ?? ""] ?? "حصلت مشكلة، جرّب تاني.";
export default function CheckIn() {
  const [tok, setTok] = useState(""); const [p, setP] = useState<P>(); const [r, setR] = useState<R>(); const [m, setM] = useState(""); const [busy, setBusy] = useState(false); const [s, setS] = useState<"load" | "ask" | "done" | "err">("load");
  useEffect(() => { (async () => {
    const t = new URLSearchParams(location.search).get("t") ?? ""; setTok(t);
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    const { data, error } = await sb.rpc("preview_invoice", { tok: t });
    if (error) { setM(why(error.message)); setS("err"); } else { setP(data); setS("ask"); }
  })(); }, []);
  async function claim(use: boolean) {
    setBusy(true); const { data, error } = await sb.rpc("claim_invoice", { tok, use_points: use }); setBusy(false);
    if (error) { setM(why(error.message)); setS("err"); } else { navigator.vibrate?.([30, 40, 30]); setR(data); setS("done"); }
  }
  if (s === "load") return <main className="min-h-[70vh] grid place-items-center text-roast">لحظة...</main>;
  if (s === "err") return <main className="px-6 py-20 max-w-md mx-auto"><h1 className="text-3xl font-black">مقدرناش نسجّل الفاتورة</h1><p className="mt-4 leading-8 text-roast">{m}</p></main>;
  if (s === "ask" && p) {
    const disc = Math.min(Math.floor(p.balance / 10), p.total), ifUse = p.total ? Math.floor(p.points * (p.total - disc) / p.total) : 0;
    return (
      <main className="px-6 py-12 max-w-md mx-auto">
        <h1 className="text-3xl font-black">فاتورتك</h1>
        <ul className="mt-6">{p.lines.map((l, i) => <li key={i} className="py-3 border-b border-sand flex justify-between"><span>{l.name} × {ar(l.qty)}</span><span className="num">{ar(l.price * l.qty)} ج</span></li>)}</ul>
        <p className="mt-4 text-2xl font-black num">الإجمالي {ar(p.total)} ج</p>
        <button disabled={busy} onClick={() => claim(false)} className="mt-8 w-full bg-espresso text-cream font-bold py-4 disabled:opacity-50 active:scale-[.98]">سجّل الفاتورة وخد {ar(p.points)} نقطة</button>
        {disc > 0 && p.status !== "paid" && <button disabled={busy} onClick={() => claim(true)} className="mt-3 w-full border border-espresso font-bold py-4 disabled:opacity-50 active:scale-[.98]">استخدم {ar(disc * 10)} نقطة واخصم {ar(disc)} جنيه (رصيدك {ar(p.balance)} نقطة) وخد {ar(ifUse)} نقطة</button>}
        <p className="mt-4 text-xs text-roast/70 leading-6">١٠ نقط = ١ جنيه. لو استخدمت نقاطك بتجمع نقاط على المبلغ اللي هتدفعه بس.</p>
      </main>);
  }
  return (
    <main className="bg-espresso text-cream min-h-[85vh] px-6 py-16 text-center">
      <div className="relative w-24 mx-auto"><motion.span className="absolute inset-0 rounded-full border-2 border-brass" initial={{ scale: .8, opacity: .7 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.3, repeat: 2 }} /><svg viewBox="0 0 52 52" className="w-24 mx-auto"><circle cx="26" cy="26" r="24" fill="none" stroke="#B07B52" strokeWidth="2" />
        <motion.path d="M14 27l8 8 16-17" fill="none" stroke="#B07B52" strokeWidth="3" initial={{ pathLength: 0 } as any} animate={{ pathLength: 1 } as any} transition={{ duration: .6, delay: .2 }} /></svg></div>
      <h1 className="text-4xl font-black mt-8">اتسجّلت فاتورتك</h1>
      <p className="mt-4 text-cream/80 num">المطلوب دفعه {ar(r!.paid)} ج{r!.discount > 0 ? ` (بعد خصم ${ar(r!.discount)} ج من نقاطك)` : ""}</p>
      <p className="text-brass text-2xl font-black mt-3 num">+<Counter to={r!.earned} /> نقطة</p>
      <div className="mt-10 flex justify-center"><StreakCups count={Math.min(r!.streak, r!.target)} target={r!.target} /></div>
      <p className="mt-6 leading-8 text-cream/80">{`ستريك ${ar(r!.streak)} يوم ورا بعض.`}</p>
    </main>);
}

"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "@/lib/supabase";
type R = { points: number; streak: number; target: number; earned: boolean };
const MSG: Record<string, string> = {
  "session closed": "التسجيل مقفول دلوقتي. اسأل الكاشير يفتحه وامسح الكود تاني.",
  "already today": "إنت سجّلت زيارتك النهارده خلاص. نشوفك بكرة!",
  "not allowed": "حسابك موقوف. كلّم الكاشير.",
};
export default function CheckIn() {
  const [s, setS] = useState<"load" | "ok" | "err">("load"); const [r, setR] = useState<R>(); const [m, setM] = useState("");
  useEffect(() => { (async () => {
    const t = new URLSearchParams(location.search).get("t");
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    const { data, error } = await sb.rpc("scan_checkin", { tok: t ?? "" });
    if (error) { setM(MSG[Object.keys(MSG).find(k => error.message.includes(k)) ?? ""] ?? "حصلت مشكلة، جرّب تاني."); setS("err"); } else { setR(data); setS("ok"); }
  })(); }, []);
  if (s === "load") return <main className="min-h-[70vh] grid place-items-center text-roast">لحظة، بنسجّل زيارتك...</main>;
  if (s === "err") return <main className="px-6 py-20 max-w-md mx-auto"><h1 className="text-3xl font-black">مقدرناش نسجّل</h1><p className="mt-4 leading-8 text-roast">{m}</p></main>;
  return (
    <main className="bg-espresso text-cream min-h-[85vh] px-6 py-16 text-center">
      <svg viewBox="0 0 52 52" className="w-24 mx-auto"><circle cx="26" cy="26" r="24" fill="none" stroke="#B38A4A" strokeWidth="2" />
        <motion.path d="M14 27l8 8 16-17" fill="none" stroke="#B38A4A" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .6, delay: .2 }} /></svg>
      <h1 className="text-4xl font-black mt-8">اتسجّلت زيارتك</h1>
      <p className="text-brass text-2xl font-black mt-3 num">+{r!.points.toLocaleString("ar-EG")} نقطة</p>
      <div className="flex justify-center gap-2 mt-10" dir="ltr">
        {Array.from({ length: r!.target }).map((_, i) => (
          <motion.span key={i} initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .5 + i * .06 }}
            className={`w-8 h-8 rounded-full border ${r!.earned || i < r!.streak ? "bg-brass border-brass" : "border-cream/30"}`} />
        ))}
      </div>
      <p className="mt-6 leading-8 text-cream/80">{r!.earned ? "كملت الستريك! مشروبك المجاني مستنيك يوم الجمعة." : `ستريك ${r!.streak.toLocaleString("ar-EG")} من ${r!.target.toLocaleString("ar-EG")}. متفوتش بكرة.`}</p>
    </main>
  );
}

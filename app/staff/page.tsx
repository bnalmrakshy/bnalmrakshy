"use client";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { sb } from "@/lib/supabase";
type S = { id: string | null; token: string; expires_at: string };
export default function Staff() {
  const [s, setS] = useState<S | null>(null); const [left, setLeft] = useState(0); const [msg, setMsg] = useState(""); const [code, setCode] = useState("");
  const apply = (d: S | null) => setS(d?.id ? d : null);
  const rotate = useCallback(async () => { const { data, error } = await sb.rpc("rotate_session"); if (error) setMsg("الصفحة دي للكاشير بس. سجّل دخول بحساب الموظف."); else apply(data); }, []);
  useEffect(() => { rotate(); const i = setInterval(rotate, 20000); return () => clearInterval(i); }, [rotate]);
  useEffect(() => { const i = setInterval(() => setLeft(s ? Math.max(0, Math.round((+new Date(s.expires_at) - Date.now()) / 1000)) : 0), 500); return () => clearInterval(i); }, [s]);
  async function open(mins: number) { setMsg(""); const { data, error } = await sb.rpc("open_session", { mins }); if (error) setMsg("مش مسموح."); else apply(data); }
  async function close() { await sb.rpc("close_session"); setS(null); }
  async function redeem(e: React.FormEvent) {
    e.preventDefault(); const { data, error } = await sb.rpc("use_drink", { c: code.trim() });
    setMsg(error ? "الكود غلط أو مستخدم أو مش بتاع النهارده." : `تمام، مشروب مجاني لـ ${data}.`); if (!error) setCode("");
  }
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <main className="px-6 py-10 max-w-md mx-auto">
      <h1 className="text-3xl font-black">لوحة الكاشير</h1>
      {s ? (
        <section className="mt-8 text-center">
          <div className="bg-white p-5 inline-block"><QRCodeSVG value={`${location.origin}/checkin?t=${s.token}`} size={240} /></div>
          <p className="mt-4 text-2xl font-black num" dir="ltr">{mm}:{ss}</p>
          <p className="text-sm text-roast/70 mt-1">التسجيل مفتوح. الكود بيتغيّر كل ٢٠ ثانية.</p>
          <button onClick={close} className="mt-6 w-full bg-espresso text-cream font-bold py-4 active:scale-[.98]">قفل التسجيل</button>
        </section>
      ) : (
        <section className="mt-8">
          <p className="text-roast mb-4">التسجيل مقفول. افتحه لما يكون فيه زباين.</p>
          <div className="grid grid-cols-3 gap-px bg-roast/15">{[2, 5, 10].map(n => <button key={n} onClick={() => open(n)} className="bg-cream py-5 font-black active:bg-sand">{n.toLocaleString("ar-EG")} دقايق</button>)}</div>
        </section>
      )}
      <form onSubmit={redeem} className="mt-12 border-t border-sand pt-6">
        <h2 className="font-black text-xl">مشروب الجمعة المجاني</h2>
        <input value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="كود الزبون" className="mt-4 w-full bg-transparent border-b border-roast/30 py-3 text-lg tracking-widest outline-none focus:border-brass" />
        <button className="mt-4 w-full border border-espresso font-bold py-3 active:scale-[.98]">تأكيد</button>
      </form>
      {msg && <p role="status" className="mt-6 text-caramel font-semibold">{msg}</p>}
    </main>
  );
}

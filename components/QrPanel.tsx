"use client";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { sb } from "@/lib/supabase";
type S = { id: string | null; token: string; expires_at: string };
export default function QrPanel() {
  const [s, setS] = useState<S | null>(null); const [left, setLeft] = useState(0); const [msg, setMsg] = useState("");
  const apply = (d: S | null) => setS(d?.id ? d : null);
  const rotate = useCallback(async () => { const { data, error } = await sb.rpc("rotate_session"); if (error) setMsg("توليد الكود للأدمن بس."); else apply(data); }, []);
  useEffect(() => { rotate(); const i = setInterval(rotate, 20000); return () => clearInterval(i); }, [rotate]);
  useEffect(() => { const i = setInterval(() => { const r = s ? Math.max(0, Math.round((+new Date(s.expires_at) - Date.now()) / 1000)) : 0; setLeft(r); if (s && r === 0) setS(null); }, 500); return () => clearInterval(i); }, [s]);
  async function open(mins: number) { setMsg(""); const { data, error } = await sb.rpc("open_session", { mins }); if (error) setMsg("مش مسموح."); else apply(data); }
  async function close() { await sb.rpc("close_session"); setS(null); }
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <section className="mt-6 max-w-sm">
      {s ? <div className="text-center">
        <div className="bg-white p-5 inline-block"><QRCodeSVG value={`${location.origin}/checkin?t=${s.token}`} size={240} /></div>
        <p className="mt-4 text-3xl font-black num" dir="ltr">{mm}:{ss}</p>
        <p className="text-sm text-roast/70 mt-1 leading-6">الزبون يفتح الموقع ويدوس «مسح» ويصوّر الكود. بيتغيّر كل ٢٠ ثانية، وبيقفل لوحده لما الوقت يخلص.</p>
        <button onClick={close} className="mt-6 w-full bg-espresso text-cream font-bold py-4 active:scale-[.98]">قفل التسجيل دلوقتي</button>
      </div> : <div>
        <p className="text-roast mb-4">مفيش كود شغّال. اختار المدة وهيظهر الكود.</p>
        <div className="grid grid-cols-3 gap-px bg-roast/15">{[1, 2, 3].map(n => <button key={n} onClick={() => open(n)} className="bg-cream py-5 font-black active:bg-sand">{n.toLocaleString("ar-EG")} {n === 1 ? "دقيقة" : "دقايق"}</button>)}</div>
      </div>}
      {msg && <p role="status" className="mt-4 text-caramel font-semibold">{msg}</p>}
    </section>);
}

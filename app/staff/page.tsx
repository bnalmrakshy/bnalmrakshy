"use client";
import { useState } from "react";
import Gate from "@/components/Gate";
import { sb } from "@/lib/supabase";
function Staff() {
  const [code, setCode] = useState(""); const [msg, setMsg] = useState("");
  async function redeem(e: React.FormEvent) {
    e.preventDefault(); setMsg(""); const { data, error } = await sb.rpc("use_drink", { c: code.trim() });
    setMsg(error ? "الكود غلط أو مستخدم أو مش بتاع النهارده." : `تمام، مشروب مجاني لـ ${data}.`); if (!error) setCode("");
  }
  return (
    <main className="px-6 py-10 max-w-md mx-auto">
      <h1 className="text-3xl font-black">لوحة الكاشير</h1>
      <form onSubmit={redeem} className="mt-8">
        <h2 className="font-black text-xl">مشروب الجمعة المجاني</h2>
        <input value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="كود الزبون" className="mt-4 w-full bg-transparent border-b border-roast/30 py-3 text-lg tracking-widest outline-none focus:border-brass" />
        <button className="mt-4 w-full border border-espresso font-bold py-3 active:scale-[.98]">تأكيد</button>
      </form>
      {msg && <p role="status" className="mt-6 text-caramel font-semibold">{msg}</p>}
    </main>);
}
export default function Page() { return <Gate need="staff">{() => <Staff />}</Gate>; }

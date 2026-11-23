"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Gate from "@/components/Gate";
import Sk from "@/components/Skeleton";
import { sb, ar } from "@/lib/supabase";
const STEPS = [["new", "اتسجّل"], ["preparing", "بيتحضّر"], ["on_way", "في الطريق"], ["delivered", "اتسلّم"]];
function Orders() {
  const [rows, setRows] = useState<any[] | null>(null); const [msg, setMsg] = useState("");
  const load = useCallback(async () => { const r = await sb.from("orders").select("id,order_no,status,total,fee,address,created_at,cancel_reason,areas(name),order_items(name,qty)").order("created_at", { ascending: false }).limit(30); if (r.error) return setMsg("تعذّر تحميل طلباتك."); setRows(r.data as any[]); }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  async function cancel(id: string) { if (!confirm("إلغاء الطلب؟")) return; const r = await sb.rpc("cancel_my_order", { p_id: id }); setMsg(r.error ? "مينفعش تلغي الطلب بعد ما بدأ التحضير." : ""); load(); }
  return (
    <main className="mx-auto max-w-lg px-5 pt-5 pb-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-black">طلباتي</h1><Link href="/order" className="text-sm font-bold underline">طلب جديد</Link></div>
      {msg && <p role="status" className="mt-3 text-caramel font-bold text-sm">{msg}</p>}
      {rows === null ? <div className="mt-4 space-y-3"><Sk className="h-32" /><Sk className="h-32" /></div> : rows.length === 0 ? <p className="mt-6 rounded-2xl bg-sand p-5 leading-7">لسه ماطلبتش توصيل. <Link href="/order" className="underline font-bold">اطلب دلوقتي</Link></p> :
        <ul className="mt-4 space-y-3">{rows.map(r => { const idx = STEPS.findIndex(s => s[0] === r.status);
          return <li key={r.id} className="rounded-3xl bg-sand/60 p-4"><div className="flex justify-between"><b className="num">طلب #{ar(r.order_no)}</b><b className="num">{ar(r.total)} ج</b></div>
            <p className="mt-1 text-sm text-roast">{r.order_items.map((i: any) => `${i.name} × ${ar(i.qty)}`).join("، ")}</p><p className="text-xs text-roast mt-1">{r.areas?.name} — {r.address}</p>
            {r.status === "cancelled" ? <p className="mt-3 text-sm font-bold text-caramel">اتلغى{r.cancel_reason ? `: ${r.cancel_reason}` : ""}</p> :
              <div className="mt-4 grid grid-cols-4 gap-1">{STEPS.map(([k, l], i) => <div key={k} className="text-center"><div className={`h-1.5 rounded-full ${i <= idx ? "bg-espresso" : "bg-white"}`} /><p className={`mt-1.5 text-[11px] ${i === idx ? "font-black" : "text-roast"}`}>{l}</p></div>)}</div>}
            {r.status === "new" && <button onClick={() => cancel(r.id)} className="mt-3 text-sm underline text-roast">إلغاء الطلب</button>}</li>; })}</ul>}
    </main>);
}
export default function Page() { return <Gate>{() => <Orders />}</Gate>; }

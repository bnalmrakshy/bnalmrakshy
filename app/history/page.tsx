"use client";
import { useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import { sb, ar } from "@/lib/supabase";
type Inv = { id: string; claimed_at: string; total: number; discount: number; points_earned: number; invoice_items: { name: string; qty: number; price: number }[] };
function H({ me }: { me: Me }) {
  const [rows, setRows] = useState<Inv[] | null>(null); const [bal, setBal] = useState(0); const [err, setErr] = useState(false);
  useEffect(() => { (async () => {
    const [a, b] = await Promise.all([
      sb.from("invoices").select("id,claimed_at,total,discount,points_earned,invoice_items(name,qty,price)").eq("claimed_by", me.id).order("claimed_at", { ascending: false }).limit(100),
      sb.from("points_ledger").select("delta").eq("member_id", me.id)]);
    if (a.error || b.error) return setErr(true);
    setRows(a.data as any); setBal((b.data ?? []).reduce((x, y) => x + y.delta, 0));
  })(); }, [me.id]);
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل السجل. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!rows) return <main className="min-h-[60vh] grid place-items-center text-roast">بنحمّل...</main>;
  return (
    <main className="px-6 py-12 md:px-16 max-w-2xl">
      <h1 className="text-3xl font-black">سجل المشتريات</h1>
      <p className="mt-2 num">رصيدك الحالي <b>{ar(bal)}</b> نقطة</p>
      {rows.length === 0 ? <p className="mt-8 leading-8">لسه معندكش مشتريات. أول فاتورة تمسحها هتظهر هنا.</p> :
        <ul className="mt-6">{rows.map(r => (
          <li key={r.id} className="py-5 border-b border-sand">
            <div className="flex justify-between text-sm text-roast/70 num"><span>{new Date(r.claimed_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" })}</span><span>+{ar(r.points_earned)} نقطة</span></div>
            <ul className="mt-2 text-sm">{r.invoice_items.map((i, k) => <li key={k} className="flex justify-between"><span>{i.name} × {ar(i.qty)}</span><span className="num">{ar(i.price * i.qty)} ج</span></li>)}</ul>
            <p className="mt-2 font-black num">الإجمالي {ar(r.total)} ج{r.discount > 0 ? ` · خصم ${ar(r.discount)} نقطة` : ""}</p>
          </li>))}</ul>}
    </main>);
}
export default function Page() { return <Gate>{me => <H me={me} />}</Gate>; }

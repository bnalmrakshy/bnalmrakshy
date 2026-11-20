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
  const spent = rows.reduce((a, r) => a + r.total - r.discount, 0);
  return (
    <main className="mx-auto max-w-lg px-5 pt-5 pb-4">
      <div className="rounded-3xl bg-espresso text-cream p-6"><p className="text-cream/60 text-sm">رصيدك</p><p className="text-5xl font-black num">{ar(bal)} <span className="text-base text-brass">نقطة</span></p>
        <div className="grid grid-cols-2 gap-3 mt-5"><div className="rounded-2xl bg-white/10 py-3 text-center"><p className="text-2xl font-black num">{ar(rows.length)}</p><p className="text-xs text-cream/70">فاتورة</p></div>
          <div className="rounded-2xl bg-white/10 py-3 text-center"><p className="text-2xl font-black num">{ar(spent)}</p><p className="text-xs text-cream/70">ج دفعتهم</p></div></div></div>
      <h1 className="mt-8 mb-3 text-xl font-black">سجل المشتريات</h1>
      {rows.length === 0 ? <p className="rounded-2xl bg-sand p-5 leading-7">لسه معندكش مشتريات. أول فاتورة تمسحها هتظهر هنا.</p> :
        <ul className="space-y-4">{rows.map(r => (
          <li key={r.id} className="rounded-2xl bg-sand/60 p-4">
            <div className="flex items-center justify-between"><span className="text-xs text-roast/70 num">{new Date(r.claimed_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="text-[11px] font-bold bg-espresso text-cream rounded-full px-2.5 py-1 num">+{ar(r.points_earned)} نقطة</span></div>
            <ul className="mt-3 space-y-1 text-sm">{r.invoice_items.map((i, k) => <li key={k} className="flex justify-between"><span>{i.name} × {ar(i.qty)}</span><span className="num text-roast">{ar(i.price * i.qty)} ج</span></li>)}</ul>
            <div className="mt-3 pt-3 border-t border-dashed border-roast/30 flex items-end justify-between"><span className="text-xs text-roast">{r.discount > 0 ? `خصم ${ar(r.discount)} نقطة` : "الإجمالي"}</span><span className="text-2xl font-black num">{ar(r.total - r.discount)} <span className="text-xs">ج</span></span></div>
          </li>))}</ul>}
    </main>);
}
export default function Page() { return <Gate>{me => <H me={me} />}</Gate>; }

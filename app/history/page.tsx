"use client";
import { useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import Icon from "@/components/Icons";
import Sk from "@/components/Skeleton";
import Counter from "@/components/Counter";
import { sb, ar } from "@/lib/supabase";
type Led = { id: number; delta: number; reason: string; created_at: string; invoice_id: string | null };
type Inv = { id: string; total: number; discount: number; invoice_items: { name: string; qty: number; price: number }[] };
const LAB: Record<string, string> = { invoice: "كسبت نقاط من فاتورة", redeem: "استبدلت نقاط بخصم", invoice_refund: "اتسحبت نقاط (فاتورة اتسترجعت)", redeem_refund: "رجعتلك نقاط (فاتورة اتسترجعت)" };
function W({ me }: { me: Me }) {
  const [led, setLed] = useState<Led[] | null>(null); const [inv, setInv] = useState<Record<string, Inv>>({}); const [menu, setMenu] = useState<{ name: string; price: number }[]>([]); const [err, setErr] = useState(false); const [tab, setTab] = useState("all"); const [open, setOpen] = useState("");
  useEffect(() => { (async () => {
    const [a, b, c] = await Promise.all([
      sb.from("points_ledger").select("id,delta,reason,created_at,invoice_id").eq("member_id", me.id).order("created_at", { ascending: false }).limit(150),
      sb.from("invoices").select("id,total,discount,invoice_items(name,qty,price)").eq("claimed_by", me.id).limit(150), sb.from("menu_items").select("name,price")]);
    if (a.error || b.error) return setErr(true);
    setLed(a.data as any); setInv(Object.fromEntries((b.data as any[]).map(x => [x.id, x]))); setMenu(c.data ?? []);
  })(); }, [me.id]);
  if (err) return <main className="px-6 py-20">مقدرناش نحمّل المحفظة. <button className="underline font-bold" onClick={() => location.reload()}>جرّب تاني</button></main>;
  if (!led) return <main className="mx-auto max-w-lg px-5 pt-5 space-y-3"><Sk className="h-44 rounded-3xl" />{[0, 1, 2].map(k => <Sk key={k} className="h-20" />)}</main>;
  const bal = led.reduce((a, x) => a + x.delta, 0); const egp = Math.floor(bal / 10);
  const afford = menu.filter(i => i.price <= egp).sort((x, y) => y.price - x.price).slice(0, 4);
  const list = led.filter(x => tab === "all" || (tab === "earn" ? x.delta > 0 : x.delta < 0));
  const tabs = [["all", "الكل"], ["earn", "كسبت"], ["spend", "صرفت"]];
  return (
    <main className="mx-auto max-w-lg lg:max-w-3xl px-5 lg:px-8 pt-5 pb-4">
      <div className="rounded-[2rem] bg-gradient-to-br from-espresso via-[#24160F] to-roast text-cream p-6 relative overflow-hidden"><div className="absolute inset-0 grain opacity-60" />
        <div className="relative"><p className="text-cream/60 text-sm">محفظة نقاطك</p><p className="text-6xl font-black leading-tight"><Counter to={bal} /> <span className="text-lg text-brass font-bold">نقطة</span></p>
          <p className="mt-1 text-lg num">بتساوي <b className="text-brass"><Counter to={egp} /> جنيه</b> خصم <span className="text-cream/60 text-sm">(كل ١٠ نقط بجنيه)</span></p>
          {afford.length > 0 && <div className="mt-5"><p className="text-xs text-cream/60 mb-2">تقدر تاخد بنقاطك</p><div className="flex flex-wrap gap-2">{afford.map(i => <span key={i.name} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{i.name}</span>)}</div></div>}</div></div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">{[["كسبت إجمالًا", led.filter(x => x.delta > 0).reduce((a, x) => a + x.delta, 0)], ["صرفت إجمالًا", led.filter(x => x.delta < 0).reduce((a, x) => a - x.delta, 0)]].map(([l, n]) => <div key={l as string} className="rounded-2xl bg-sand/60 py-3"><p className="text-xl font-black num">{ar(n as number)}</p><p className="text-xs text-roast">{l} (نقطة)</p></div>)}</div>
      <div className="mt-4 flex gap-1 p-1 rounded-2xl bg-sand">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab === k ? "bg-espresso text-cream" : "text-roast"}`}>{l}</button>)}</div>
      {list.length === 0 ? <p className="mt-6 rounded-2xl bg-sand p-5 leading-7">{tab === "spend" ? "لسه ما صرفتش نقاط. تقدر تستخدمها لما تمسح فاتورتك." : tab === "earn" ? "لسه ماكسبتش نقاط." : "لسه مفيش حركة. أول فاتورة تمسحها هتظهر هنا."}</p> :
        <ul className="mt-4 space-y-2.5">{list.map(x => { const iv = x.invoice_id ? inv[x.invoice_id] : null; const isOpen = open === String(x.id); const up = x.delta > 0;
          return <li key={x.id} className="rounded-2xl bg-sand/60">
            <button onClick={() => setOpen(isOpen ? "" : String(x.id))} className="w-full flex items-center gap-3 p-4 text-right"><span className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${up ? "bg-espresso text-cream" : "bg-white text-roast"}`}><Icon name={up ? "arrowdown" : "arrowup"} size={18} /></span>
              <span className="flex-1 min-w-0"><span className="block font-bold text-sm">{LAB[x.reason] ?? "حركة"}</span><span className="block text-xs text-roast num">{new Date(x.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" })}</span></span>
              <span className="font-black num shrink-0">{ar(Math.abs(x.delta))} <span className="text-xs">نقطة</span></span></button>
            {isOpen && iv && <div className="px-4 pb-4 text-sm"><ul className="space-y-1">{iv.invoice_items.map((i, k) => <li key={k} className="flex justify-between"><span>{i.name} × {ar(i.qty)}</span><span className="num text-roast">{ar(i.price * i.qty)} ج</span></li>)}</ul>
              <p className="mt-2 pt-2 border-t border-dashed border-roast/30 flex justify-between font-black num"><span>{iv.discount > 0 ? `بعد خصم ${ar(iv.discount)} ج` : "الإجمالي"}</span><span>{ar(iv.total - iv.discount)} ج</span></p></div>}
          </li>; })}</ul>}
    </main>);
}
export default function Page() { return <Gate>{me => <W me={me} />}</Gate>; }

"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import Icon from "@/components/Icons";
import Accounting from "@/components/Accounting";
import Dashboard from "@/components/Dashboard";
import Insights from "@/components/Insights";
import Members from "@/components/Members";
import Overview from "@/components/admin/Overview";
import Orders from "@/components/admin/Orders";
import Journal from "@/components/admin/Journal";
import StockPanel from "@/components/admin/StockPanel";
import { AdminProvider, useAdmin } from "@/components/admin/ctx";
import { AreasSettings, BranchesSettings, SystemSettings } from "@/components/admin/Settings";
import { ItemsPanel, PartiesPanel, PurchasesPanel, ReportsPanel, SalesPanel, TreasuryPanel } from "@/components/Office";
type Sub = [string, string];
const NAV: { k: string; t: string; ic: any; subs: Sub[] }[] = [
  { k: "home", t: "الرئيسية", ic: "home", subs: [["overview", "نظرة عامة"]] },
  { k: "sales", t: "المبيعات", ic: "cart", subs: [["orders", "طلبات التوصيل"], ["invoices", "الفواتير"], ["analytics", "التحليل"], ["reports", "الجرد والتقارير"]] },
  { k: "stock", t: "المخزون", ic: "box", subs: [["items", "الأصناف"], ["branches", "مخزون الفروع"], ["purchases", "المشتريات"], ["parties", "عملاء وموردين"]] },
  { k: "acc", t: "المحاسبة", ic: "wallet", subs: [["statements", "القوائم المالية"], ["treasury", "الخزن والسندات"], ["journal", "القيود والإقفال"]] },
  { k: "people", t: "العملاء", ic: "people", subs: [["members", "الأعضاء"], ["insights", "تحليلات وموقع"]] },
  { k: "settings", t: "الإعدادات", ic: "user", subs: [["branches", "الفروع"], ["areas", "المناطق والتوصيل"], ["system", "النظام والنسخ"]] },
];
const MAIN = ["home", "sales", "stock", "acc"];
function Shell({ me }: { me: Me }) {
  const { branch, setBranch, branches } = useAdmin(); const [sec, setSec] = useState("home"); const [sub, setSub] = useState("overview"); const [more, setMore] = useState(false);
  useEffect(() => { const f = () => { const [s, t] = location.hash.slice(1).split("/"); const n = NAV.find(x => x.k === s); if (n) { setSec(s); setSub(n.subs.some(x => x[0] === t) ? t : n.subs[0][0]); } }; f(); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = useCallback((s: string, t?: string) => { const n = NAV.find(x => x.k === s)!; location.hash = `${s}/${t ?? n.subs[0][0]}`; setMore(false); window.scrollTo({ top: 0 }); }, []);
  const cur = NAV.find(x => x.k === sec)!; const key = `${sec}/${sub}`;
  const V: Record<string, React.ReactNode> = {
    "home/overview": <Overview go={go} />, "sales/orders": <Orders />, "sales/invoices": <SalesPanel />, "sales/analytics": <Dashboard />, "sales/reports": <ReportsPanel />,
    "stock/items": <ItemsPanel />, "stock/branches": <StockPanel />, "stock/purchases": <PurchasesPanel />, "stock/parties": <PartiesPanel />,
    "acc/statements": <Accounting />, "acc/treasury": <TreasuryPanel />, "acc/journal": <Journal />,
    "people/members": <Members meId={me.id} dev={me.role === "developer"} />, "people/insights": <Insights />,
    "settings/branches": <BranchesSettings />, "settings/areas": <AreasSettings />, "settings/system": <SystemSettings /> };
  const btn = (n: typeof NAV[number], cls: string) => <button key={n.k} onClick={() => go(n.k)} className={cls}><Icon name={n.ic} size={22} /><span>{n.t}</span></button>;
  return (
    <div className="mx-auto max-w-7xl lg:flex pb-24 lg:pb-8">
      <aside className="hidden lg:block w-56 shrink-0 p-4 sticky top-14 self-start">
        <nav className="space-y-1">{NAV.map(n => btn(n, `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-right ${sec === n.k ? "bg-espresso text-cream" : "text-roast hover:bg-sand/60"}`))}</nav>
        <div className="mt-6 pt-4 border-t border-sand space-y-1 text-sm"><Link href="/pos" className="block px-3 py-2 rounded-lg text-roast hover:bg-sand/60">شاشة الكاشير</Link><Link href="/delivery" className="block px-3 py-2 rounded-lg text-roast hover:bg-sand/60">طلبات التوصيل</Link></div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="sticky top-14 z-20 bg-white/95 backdrop-blur border-b border-sand px-4 lg:px-8 pt-3">
          <div className="flex items-center justify-between gap-3"><h1 className="text-lg font-black">{cur.t}</h1>
            <select value={branch} onChange={e => setBranch(e.target.value)} aria-label="الفرع" className="!w-auto max-w-[55%]"><option value="">كل الفروع</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          {cur.subs.length > 1 && <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">{cur.subs.map(([k, l]) => <button key={k} onClick={() => go(sec, k)} className={`shrink-0 px-4 py-2.5 text-sm font-bold border-b-2 ${sub === k ? "border-espresso text-espresso" : "border-transparent text-roast"}`}>{l}</button>)}</div>}
        </div>
        <div className="px-4 lg:px-8 py-5">{V[key]}</div>
      </div>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV.filter(n => MAIN.includes(n.k)).map(n => btn(n, `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${sec === n.k ? "text-espresso" : "text-roast/50"}`))}
        <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${!MAIN.includes(sec) ? "text-espresso" : "text-roast/50"}`}><Icon name="user" size={22} />المزيد</button>
      </nav>
      {more && <div className="lg:hidden fixed inset-0 z-50 bg-espresso/60 grid items-end" onClick={() => setMore(false)} role="dialog" aria-modal>
        <div className="bg-white rounded-t-3xl p-5 space-y-2" onClick={e => e.stopPropagation()}>
          {NAV.filter(n => !MAIN.includes(n.k)).map(n => btn(n, "w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-sand/60 font-bold text-right"))}
          <Link href="/pos" className="block px-4 py-4 rounded-xl bg-sand/60 font-bold">شاشة الكاشير</Link><Link href="/delivery" className="block px-4 py-4 rounded-xl bg-sand/60 font-bold">طلبات التوصيل</Link>
          <button onClick={() => setMore(false)} className="w-full py-3 text-roast text-sm">إغلاق</button></div></div>}
    </div>);
}
export default function Page() { return <Gate need="admin">{me => <AdminProvider><Shell me={me} /></AdminProvider>}</Gate>; }

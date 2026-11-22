"use client";
import Link from "next/link";
import { useState } from "react";
import Gate from "@/components/Gate";
import Accounting from "@/components/Accounting";
import Dashboard from "@/components/Dashboard";
import Insights from "@/components/Insights";
import { ItemsPanel, PartiesPanel, PurchasesPanel, ReportsPanel, SalesPanel, TreasuryPanel } from "@/components/Office";
import { sb } from "@/lib/supabase";
const G: [string, [string, string][]][] = [
  ["التشغيل", [["dash", "لوحة المعلومات"], ["sales", "الفواتير والاسترجاع"], ["reports", "الجرد والتقارير"]]],
  ["المحاسبة", [["acc", "المحاسبة والقوائم المالية"], ["treasury", "الخزن والسندات"], ["purchases", "المشتريات والمرتجع"], ["parties", "العملاء والموردين"]]],
  ["المخزون والمنيو", [["items", "الأصناف والمخزون"]]],
  ["العملاء", [["insights", "تحليلات العملاء والمناطق"]]]];
async function backup() {
  const r = await sb.rpc("backup_data"); if (r.error) return alert("تعذّر عمل النسخة: " + r.error.message);
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)], { type: "application/json" })); a.download = `نسخة_احتياطية_${new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function Office() {
  const [tab, setTab] = useState("dash"); const title = G.flatMap(g => g[1]).find(x => x[0] === tab)![1];
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-4 pb-10 lg:flex lg:gap-8">
      <aside className="lg:w-60 shrink-0 lg:sticky lg:top-20 lg:self-start text-sm">
        <div className="hidden lg:block">{G.map(([g, items]) => <div key={g} className="mb-4"><p className="text-xs font-bold text-roast/60 mb-1.5 px-3">{g}</p>{items.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`block w-full text-right px-3 py-2 rounded-lg ${tab === k ? "bg-espresso text-cream font-bold" : "text-roast hover:bg-sand/60"}`}>{l}</button>)}</div>)}
          <div className="border-t border-sand pt-3 space-y-1"><Link href="/pos" className="block px-3 py-2 rounded-lg text-roast hover:bg-sand/60">شاشة الكاشير</Link><Link href="/admin" className="block px-3 py-2 rounded-lg text-roast hover:bg-sand/60">الأعضاء والتطبيق</Link><button onClick={backup} className="block w-full text-right px-3 py-2 rounded-lg text-roast hover:bg-sand/60">نسخة احتياطية</button></div></div>
        <select className="lg:hidden w-full" value={tab} onChange={e => setTab(e.target.value)}>{G.map(([g, items]) => <optgroup key={g} label={g}>{items.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>)}</select>
        <div className="lg:hidden mt-2 flex gap-4 text-xs"><Link href="/pos" className="underline">الكاشير</Link><Link href="/admin" className="underline">الأعضاء</Link><button onClick={backup} className="underline">نسخة احتياطية</button></div>
      </aside>
      <div className="flex-1 min-w-0 mt-4 lg:mt-0"><h1 className="text-xl font-black mb-4">{title}</h1>
        {tab === "dash" && <Dashboard />}{tab === "sales" && <SalesPanel />}{tab === "reports" && <ReportsPanel />}{tab === "acc" && <Accounting />}{tab === "treasury" && <TreasuryPanel />}{tab === "purchases" && <PurchasesPanel />}{tab === "parties" && <PartiesPanel />}{tab === "items" && <ItemsPanel />}{tab === "insights" && <Insights />}</div>
    </main>);
}
export default function Page() { return <Gate need="admin">{() => <Office />}</Gate>; }

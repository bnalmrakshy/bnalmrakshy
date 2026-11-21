"use client";
import Link from "next/link";
import { useState } from "react";
import Gate from "@/components/Gate";
import { ItemsPanel, PartiesPanel, PurchasesPanel, ReportsPanel, TreasuryPanel } from "@/components/Office";
const S = [["reports", "الجرد والتقارير"], ["items", "الأصناف والمخزون"], ["purchases", "المشتريات والمرتجع"], ["parties", "العملاء والموردين"], ["treasury", "الخزن والسندات"]] as const;
function Office() {
  const [tab, setTab] = useState<string>("reports");
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-4 pb-6 lg:flex lg:gap-8">
      <aside className="lg:w-56 shrink-0 lg:sticky lg:top-20 lg:self-start">
        <h1 className="text-2xl font-black mb-3">المكتب</h1>
        <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2">{S.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 text-right px-4 py-3 rounded-xl text-sm font-bold ${tab === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}
          <Link href="/admin" className="shrink-0 px-4 py-3 rounded-xl text-sm font-bold bg-sand text-roast">الأعضاء والتطبيق</Link><Link href="/pos" className="shrink-0 px-4 py-3 rounded-xl text-sm font-bold bg-sand text-roast">شاشة الكاشير</Link></nav>
      </aside>
      <div className="flex-1 min-w-0 mt-4 lg:mt-0">{tab === "reports" && <ReportsPanel />}{tab === "items" && <ItemsPanel />}{tab === "purchases" && <PurchasesPanel />}{tab === "parties" && <PartiesPanel />}{tab === "treasury" && <TreasuryPanel />}</div>
    </main>);
}
export default function Page() { return <Gate need="admin">{() => <Office />}</Gate>; }

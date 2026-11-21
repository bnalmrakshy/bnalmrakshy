"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import Gate from "@/components/Gate";
import Icon from "@/components/Icons";
import Dashboard from "@/components/Dashboard";
import { sb } from "@/lib/supabase";
import { ItemsPanel, PartiesPanel, PurchasesPanel, ReportsPanel, SalesPanel, TreasuryPanel } from "@/components/Office";
const S = [["dash", "لوحة المعلومات", "chart"], ["reports", "الجرد والتقارير", "doc"], ["sales", "الفواتير والاسترجاع", "cart"], ["items", "الأصناف والمخزون", "box"], ["purchases", "المشتريات والمرتجع", "cart"], ["parties", "العملاء والموردين", "people"], ["treasury", "الخزن والسندات", "wallet"]] as const;
async function backup() {
  const r = await sb.rpc("backup_data"); if (r.error) return alert("تعذّر عمل النسخة: " + r.error.message);
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)], { type: "application/json" })); a.download = `نسخة_احتياطية_${new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function Office({ name }: { name: string }) {
  const [tab, setTab] = useState<string>("dash"); const cur = S.find(s => s[0] === tab)!;
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-4 pb-6 lg:flex lg:gap-8">
      <aside className="lg:w-60 shrink-0 lg:sticky lg:top-20 lg:self-start">
        <div className="hidden lg:block rounded-3xl bg-espresso text-cream p-5 mb-4"><p className="text-xs text-cream/60">أهلًا</p><p className="text-lg font-black truncate">{name}</p><p className="text-xs text-brass mt-1">المكتب</p></div>
        <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2">{S.map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`relative shrink-0 flex items-center gap-3 text-right px-4 py-3 rounded-2xl text-sm font-bold transition ${tab === k ? "text-cream" : "bg-sand/70 text-roast hover:bg-sand"}`}>
            {tab === k && <motion.span layoutId="office-tab" className="absolute inset-0 rounded-2xl bg-espresso -z-10" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}<Icon name={ic} size={20} />{l}</button>))}
          <Link href="/admin" className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-sand/70 text-roast"><Icon name="user" size={20} />الأعضاء والتطبيق</Link>
          <button onClick={backup} className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-sand/70 text-roast"><Icon name="doc" size={20} />نسخة احتياطية</button>
          <Link href="/pos" className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-sand/70 text-roast"><Icon name="qr" size={20} />شاشة الكاشير</Link></nav>
      </aside>
      <div className="flex-1 min-w-0 mt-4 lg:mt-0"><h1 className="text-2xl font-black mb-4">{cur[1]}</h1>
        {tab === "dash" && <Dashboard />}{tab === "reports" && <ReportsPanel />}{tab === "sales" && <SalesPanel />}{tab === "items" && <ItemsPanel />}{tab === "purchases" && <PurchasesPanel />}{tab === "parties" && <PartiesPanel />}{tab === "treasury" && <TreasuryPanel />}</div>
    </main>);
}
export default function Page() { return <Gate need="admin">{me => <Office name={me.display_name} />}</Gate>; }

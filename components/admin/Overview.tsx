"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/ctx";
import Icon from "@/components/Icons";
import { sb, cairoToday } from "@/lib/supabase";
import { M } from "@/lib/erp";
export default function Overview({ go }: { go: (s: string, t?: string) => void }) {
  const { branch } = useAdmin(); const [k, setK] = useState<any>(null); const [n, setN] = useState(0); const [a, setA] = useState<any>(null);
  useEffect(() => { const t = cairoToday(); sb.rpc("dashboard_data", { d_from: t, d_to: t, p_shift: null, p_branch: branch ? +branch : null }).then(r => r.data && setK(r.data.kpi));
    sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "new").then(r => setN(r.count ?? 0)); sb.rpc("admin_alerts").then(r => r.data && setA(r.data)); }, [branch]);
  const alerts = a ? a.low_stock.length + a.open_shifts.length + a.cash_diffs.length + a.debtors.length + (a.stale > 0 ? 1 : 0) : 0;
  const stat: [string, any][] = [["مبيعات النهارده", k ? `${M(k.sales)} ج` : "—"], ["فواتير", k ? M(k.count) : "—"], ["ربح تقديري", k ? `${M(k.profit)} ج` : "—"], ["طلبات توصيل جديدة", M(n)]];
  const act: [string, string, () => void, string][] = [["الكاشير", "qr", () => (location.href = "/pos"), ""], ["طلبات التوصيل", "cart", () => go("sales", "orders"), n ? String(n) : ""], ["الفواتير", "receipt", () => go("sales", "invoices"), ""], ["تحليل المبيعات", "chart", () => go("sales", "analytics"), ""],
    ["المشتريات", "box", () => go("stock", "purchases"), ""], ["مصروف / سند", "wallet", () => go("acc", "treasury"), ""], ["القوائم المالية", "doc", () => go("acc", "statements"), ""], ["الأعضاء", "people", () => go("people", "members"), ""]];
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stat.map(([l, v]) => <div key={l} className="rounded-xl border border-sand bg-white p-4"><p className="text-xs text-roast">{l}</p><p className="mt-1 text-2xl font-black num">{v}</p></div>)}</div>
      {a && <button onClick={() => go("sales", "analytics")} className={`w-full text-right rounded-xl p-4 border ${alerts ? "border-caramel" : "border-sand"}`}><b>{alerts ? `عندك ${M(alerts)} تنبيه` : "مفيش تنبيهات"}</b><span className="block text-xs text-roast mt-1">{alerts ? "مخزون واطي أو شيفت مفتوح أو فرق كاش أو مديونيات. اضغط للتفاصيل." : "كله تمام."}</span></button>}
      <div><h2 className="font-black mb-3">اختصارات</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{act.map(([l, ic, fn, badge]) => (
        <button key={l} onClick={fn} className="relative rounded-xl border border-sand bg-white p-4 min-h-[88px] flex flex-col items-start justify-between text-right active:bg-sand/60"><Icon name={ic as any} size={24} /><span className="font-bold">{l}</span>{badge && <span className="absolute top-3 left-3 min-w-6 h-6 px-1 rounded-full bg-espresso text-cream text-xs font-black grid place-items-center num">{badge}</span>}</button>))}</div></div>
      <Link href="/delivery" className="block text-sm underline text-roast">شاشة طلبات التوصيل المبسّطة للكاشير</Link>
    </section>);
}

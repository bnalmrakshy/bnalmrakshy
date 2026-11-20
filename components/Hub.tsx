"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import type { Me } from "@/components/Gate";
import { sb, logout, ar } from "@/lib/supabase";
export default function Hub({ me }: { me: Me }) {
  const admin = me.role === "admin" || me.role === "developer"; const [top, setTop] = useState<any[] | null>(null); const [err, setErr] = useState(false);
  useEffect(() => { if (admin) sb.rpc("admin_top_customers", { lim: 10 }).then(r => r.error ? setErr(true) : setTop(r.data)); }, [admin]);
  const btn = "block text-center py-4 font-bold active:scale-[.98]";
  return (
    <main className="px-6 py-12 md:px-16 max-w-xl">
      <div className="flex items-center gap-4"><Avatar url={me.avatar_url} size={72} /><div><h1 className="text-3xl font-black">{me.display_name}</h1><p className="text-sm text-roast">{me.role === "staff" ? "كاشير" : me.role === "developer" ? "مطوّر" : "إدارة"}</p></div></div>
      <div className="mt-8 space-y-3">
        {admin && <Link href="/admin" className={btn + " bg-espresso text-cream"}>لوحة الإدارة (فاتورة جديدة والأعضاء والمنيو)</Link>}
        <Link href="/staff" className={btn + " border border-espresso"}>تأكيد مشروب الجمعة</Link>
        <Link href="/profile" className={btn + " border border-espresso"}>تعديل حسابي</Link></div>
      {admin && <section className="mt-10"><h2 className="text-xl font-black">أكتر العملاء تفاعلًا (آخر ٣٠ يوم)</h2>
        {err ? <p className="mt-3">تعذّر تحميل القايمة.</p> : top === null ? <p className="mt-3 text-roast/60">بنحمّل...</p> : top.length === 0 ? <p className="mt-3">لسه مفيش عملاء.</p> :
          <ol className="mt-3">{top.map((t, i) => <li key={i} className="py-3 border-b border-sand flex items-center gap-3"><span className="w-6 num text-roast/50">{ar(i + 1)}</span><span className="flex-1 font-bold">{t.display_name}</span>
            <span className="text-xs text-roast num">{ar(t.visits)} زيارة · {ar(t.spent)} ج</span></li>)}</ol>}</section>}
      <button onClick={logout} className="mt-10 text-sm underline text-roast">تسجيل خروج</button>
    </main>);
}

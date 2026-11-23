"use client";
import { useState } from "react";
import { btn, card, useData } from "@/components/ui";
import { sb } from "@/lib/supabase";
import { M } from "@/lib/erp";
export default function StockPanel() {
  const [items] = useData(() => sb.rpc("admin_items"), []); const [br] = useData(() => sb.from("branches").select("id,name").eq("active", true).order("id"), []); const [bs, reload] = useData(() => sb.rpc("branch_stock"), []);
  const [e, setE] = useState<Record<string, string>>({}); const [q, setQ] = useState(""); const [msg, setMsg] = useState(""); const [t, setT] = useState({ item: "", from: "", to: "", qty: "" });
  const qty = (i: number, b: number | null) => Number((bs as any[]).find(x => x.item_id === i && (x.branch_id ?? null) === b)?.qty ?? 0);
  async function save(i: any, b: number) { const k = `${i.id}-${b}`; if (e[k] === undefined) return; const r = await sb.rpc("adjust_branch_stock", { p_item: i.id, p_branch: b, p_qty: +e[k], p_note: "جرد يدوي" }); setMsg(r.error ? "تعذّر الحفظ." : "اتحفظ: " + i.name); setE(o => { const n = { ...o }; delete n[k]; return n; }); reload(); }
  async function move(ev: React.FormEvent) { ev.preventDefault(); const r = await sb.rpc("transfer_stock", { p_item: +t.item, p_from: +t.from, p_to: +t.to, p_qty: +t.qty, p_note: "نقل بين الفروع" }); setMsg(r.error ? "تعذّر النقل (راجع الاختيارات)." : "اتنقل المخزون."); setT({ ...t, qty: "" }); reload(); }
  const list = (items as any[]).filter(i => !q || i.name.includes(q) || i.category.includes(q));
  return (
    <section>
      <form onSubmit={move} className={card + " grid grid-cols-2 lg:grid-cols-5 gap-2 items-end"}><h3 className="font-black col-span-2 lg:col-span-5">نقل بين الفروع</h3>
        <select value={t.item} onChange={x => setT({ ...t, item: x.target.value })}><option value="">الصنف</option>{(items as any[]).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <select value={t.from} onChange={x => setT({ ...t, from: x.target.value })}><option value="">من فرع</option>{(br as any[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select value={t.to} onChange={x => setT({ ...t, to: x.target.value })}><option value="">إلى فرع</option>{(br as any[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input type="number" min={1} placeholder="الكمية" value={t.qty} onChange={x => setT({ ...t, qty: x.target.value })} /><button disabled={!t.item || !t.from || !t.to || !t.qty} className={btn}>نقل</button></form>
      {msg && <p role="status" className="mt-3 text-caramel font-bold text-sm">{msg}</p>}
      <input className="mt-4 w-full" placeholder="دوّر في الأصناف" value={q} onChange={x => setQ(x.target.value)} />
      <ul className="mt-3 space-y-2">{list.map(i => (
        <li key={i.id} className={card}><div className="flex justify-between"><b>{i.name}</b><span className="text-xs text-roast num">الإجمالي {M(i.stock)} · غير موزّع {M(qty(i.id, null))}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2">{(br as any[]).map(b => <div key={b.id} className="flex items-end gap-2"><label className="flex-1 text-xs">{b.name}<input type="number" className="w-full" value={e[`${i.id}-${b.id}`] ?? qty(i.id, b.id)} onChange={x => setE(o => ({ ...o, [`${i.id}-${b.id}`]: x.target.value }))} /></label>
            {e[`${i.id}-${b.id}`] !== undefined && <button onClick={() => save(i, b.id)} className={btn + " px-3"}>حفظ</button>}</div>)}</div></li>))}</ul></section>);
}

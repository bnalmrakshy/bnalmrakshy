"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/ctx";
import { btn } from "@/components/ui";
import { sb } from "@/lib/supabase";
import { M, METHOD } from "@/lib/erp";
const NEXT: Record<string, [string, string]> = { new: ["preparing", "ابدأ التحضير"], preparing: ["on_way", "خرج للتوصيل"], on_way: ["delivered", "تم التسليم"] };
const LAB: Record<string, string> = { new: "جديد", preparing: "بيتحضّر", on_way: "في الطريق", delivered: "اتسلّم", cancelled: "ملغي" };
const ago = (t: string) => { const m = Math.round((Date.now() - +new Date(t)) / 60000); return m < 1 ? "دلوقتي" : m < 60 ? `من ${m} د` : `من ${Math.floor(m / 60)} س`; };
export default function OrdersPanel() {
  const { branch } = useAdmin(); const [rows, setRows] = useState<any[] | null>(null); const [tab, setTab] = useState("open"); const [msg, setMsg] = useState(""); const [method, setMethod] = useState<Record<string, string>>({}); const prev = useRef(0);
  const load = useCallback(async () => {
    const r = await sb.from("orders").select("id,order_no,status,total,fee,address,phone,note,created_at,branch_id,profiles(display_name),areas(name),order_items(name,qty)").order("created_at", { ascending: false }).limit(120);
    if (r.error) return setMsg("تعذّر تحميل الطلبات: " + r.error.message); setRows(r.data as any[]);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  const news = (rows ?? []).filter(r => r.status === "new").length;
  useEffect(() => { if (news > prev.current) { try { const a = new AudioContext(); const o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); setTimeout(() => { o.stop(); a.close(); }, 250); } catch { /* ignore */ } } prev.current = news; }, [news]);
  async function step(r: any, to: string) { setMsg(""); const x = await sb.rpc("set_order_status", { p_id: r.id, p_status: to, p_method: method[r.id] ?? "cash", p_reason: null }); if (x.error) setMsg(x.error.message.includes("no open shift") ? "افتح الشيفت من شاشة الكاشير الأول." : "تعذّر التنفيذ: " + x.error.message); load(); }
  async function cancel(r: any) { const why = prompt("سبب الإلغاء؟"); if (why === null) return; const x = await sb.rpc("set_order_status", { p_id: r.id, p_status: "cancelled", p_method: "cash", p_reason: why || null }); if (x.error) setMsg("تعذّر الإلغاء."); load(); }
  const list = (rows ?? []).filter(r => (!branch || String(r.branch_id) === branch) && (tab === "open" ? ["new", "preparing", "on_way"].includes(r.status) : r.status === tab));
  const T: [string, string][] = [["open", `الحالية${news ? ` (${news} جديد)` : ""}`], ["delivered", "اتسلّمت"], ["cancelled", "ملغية"]];
  return (
    <section>
      <div className="flex gap-2">{T.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${tab === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{l}</button>)}</div>
      {msg && <p role="status" className="mt-3 text-caramel font-bold text-sm">{msg}</p>}
      {rows === null ? <p className="mt-4 text-roast">بنحمّل...</p> : list.length === 0 ? <p className="mt-6 rounded-xl border border-sand p-6 text-center text-roast">مفيش طلبات هنا.</p> :
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">{list.map(r => (
          <li key={r.id} className={`rounded-xl border bg-white p-4 ${r.status === "new" ? "border-espresso border-2" : "border-sand"}`}>
            <div className="flex items-center justify-between"><b className="num">طلب #{M(r.order_no)}</b><span className="text-xs text-roast">{ago(r.created_at)} · <b className="text-espresso">{LAB[r.status]}</b></span></div>
            <p className="mt-2 font-bold">{r.profiles?.display_name ?? "عميل"} · <a href={`tel:${r.phone}`} className="underline num" dir="ltr">{r.phone}</a></p>
            <p className="text-sm text-roast mt-1">{r.areas?.name} — {r.address}</p>{r.note && <p className="text-xs text-roast mt-1">ملاحظة: {r.note}</p>}
            <p className="mt-2 text-sm">{r.order_items.map((i: any) => `${i.name} × ${M(i.qty)}`).join("، ")}</p>
            <p className="mt-2 font-black num">{M(r.total)} ج <span className="text-xs font-normal text-roast">(شامل توصيل {M(r.fee)})</span></p>
            {NEXT[r.status] && <div className="mt-3 space-y-2">
              {r.status === "on_way" && <div className="grid grid-cols-3 gap-2">{["cash", "card", "instapay"].map(k => <button key={k} onClick={() => setMethod(m => ({ ...m, [r.id]: k }))} className={`py-2.5 rounded-lg text-sm font-bold ${(method[r.id] ?? "cash") === k ? "bg-espresso text-cream" : "bg-sand text-roast"}`}>{METHOD[k]}</button>)}</div>}
              <div className="flex gap-2"><button onClick={() => step(r, NEXT[r.status][0])} className={btn + " flex-1 py-3.5"}>{NEXT[r.status][1]}</button><button onClick={() => cancel(r)} className="px-4 text-sm underline text-caramel">إلغاء</button></div></div>}
          </li>))}</ul>}
    </section>);
}

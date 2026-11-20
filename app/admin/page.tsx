"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Gate from "@/components/Gate";
import InvoicePanel from "@/components/InvoicePanel";
import { sb, ar } from "@/lib/supabase";
type M = { id: string; username: string; display_name: string; role: string; suspended: boolean; streak: number; points: number; visits: number; created_at: string };
type St = { members: number; visits: number; points: number; drinks: number; staff: number; suspended: number; target: number };
const T = [["invoice", "فاتورة جديدة"], ["members", "الأعضاء"], ["audit", "السجل"], ["settings", "الإعدادات"]];
const RL: Record<string, string> = { member: "عضو", staff: "موظف", admin: "أدمن" };
const ACT: Record<string, string> = { set_role: "تغيير دور", set_suspended: "إيقاف/تفعيل", update_settings: "تعديل الإعدادات", admin_set_password: "تغيير باسورد", admin_delete_user: "حذف حساب", admin_delete_failed: "فشل حذف", open_session: "فتح تسجيل", close_session: "قفل تسجيل", use_drink: "تأكيد مشروب" };
async function api(path: string, body: object) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); return r.ok ? null : (j.error ?? "فشلت العملية") as string;
}
function Admin({ meId }: { meId: string }) {
  const [tab, setTab] = useState("invoice"); const [msg, setMsg] = useState(""); const [st, setSt] = useState<St | null>(null);
  const [q, setQ] = useState(""); const [roleF, setRoleF] = useState(""); const [statF, setStatF] = useState(""); const [sort, setSort] = useState("created_at");
  const [ms, setMs] = useState<M[] | null>(null); const [open, setOpen] = useState(""); const [det, setDet] = useState<string[]>([]);
  const [audit, setAudit] = useState<any[]>([]); const [cfg, setCfg] = useState({ pts: 10, target: 7 });
  const [modal, setModal] = useState<{ k: "pw" | "del"; m: M } | null>(null); const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [busy, setBusy] = useState(false);
  const fail = (e: { message: string }) => { setMsg("حصلت مشكلة: " + e.message); return false; };
  const loadStats = useCallback(() => { sb.rpc("admin_stats").then(r => r.error ? fail(r.error) : setSt(r.data)); }, []);
  const members = useCallback(async (s = "") => { const r = await sb.rpc("admin_members", { q: s }); r.error ? fail(r.error) : setMs(r.data); }, []);
  useEffect(() => { loadStats(); members(); sb.from("app_settings").select("points_per_visit,streak_target").single().then(r => r.data && setCfg({ pts: r.data.points_per_visit, target: r.data.streak_target })); }, [loadStats, members]);
  useEffect(() => { if (tab === "audit") sb.rpc("admin_audit", { lim: 50 }).then(r => r.error ? fail(r.error) : setAudit(r.data)); }, [tab]);
  const shown = useMemo(() => (ms ?? []).filter(m => (!roleF || m.role === roleF) && (!statF || (statF === "sus") === m.suspended))
    .sort((a, b) => sort === "created_at" ? +new Date(b.created_at) - +new Date(a.created_at) : (b as any)[sort] - (a as any)[sort]), [ms, roleF, statF, sort]);
  async function rpc(name: string, args: object) { const r = await sb.rpc(name, args); if (r.error) return fail(r.error); setMsg(""); members(q); loadStats(); return true; }
  async function toggle(m: M) { setOpen(open === m.id ? "" : m.id); setDet([]); if (open !== m.id) { const r = await sb.from("checkins").select("day").eq("member_id", m.id).order("day", { ascending: false }).limit(5); setDet((r.data ?? []).map(x => x.day)); } }
  async function submitModal(e: React.FormEvent) {
    e.preventDefault(); if (!modal) return; setMsg("");
    if (modal.k === "pw" && (p1.length < 8 || p1.length > 72 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1) || p1 !== p2)) return setMsg("الباسورد ٨ على الأقل بحروف إنجليزي وأرقام، ولازم يتطابق مع التأكيد.");
    setBusy(true); const err = await api(modal.k === "pw" ? "/api/admin/password" : "/api/admin/delete", modal.k === "pw" ? { userId: modal.m.id, password: p1 } : { userId: modal.m.id }); setBusy(false);
    if (err) return setMsg(err);
    setMsg(modal.k === "pw" ? "اتغيّر الباسورد." : "اتحذف الحساب."); setModal(null); setP1(""); setP2(""); members(q); loadStats();
  }
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (await rpc("admin_update_settings", { pts: cfg.pts, target: cfg.target })) setMsg("اتحفظت. الستريك الشغّال بيكمل بالهدف الجديد."); };
  const inp = "border-b border-roast/30 bg-transparent py-2 outline-none focus:border-brass";
  const stats: [string, number | undefined][] = [["الأعضاء", st?.members], ["الزيارات", st?.visits], ["النقاط", st?.points], ["مشروبات مستحقة", st?.drinks], ["الموظفين", st?.staff], ["موقوفين", st?.suspended]];
  return (
    <main className="px-6 py-10 md:px-16 max-w-4xl">
      <h1 className="text-3xl font-black">الإدارة</h1>
      <div className="grid grid-cols-3 gap-4 mt-6">{stats.map(([l, n]) => <div key={l}><div className="text-2xl font-black num">{n == null ? "–" : ar(n)}</div><div className="text-xs text-roast/70">{l}</div></div>)}</div>
      <div className="flex gap-1 mt-8 overflow-x-auto">{T.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 font-bold border-b-2 whitespace-nowrap ${tab === k ? "border-brass" : "border-transparent text-roast/60"}`}>{l}</button>)}</div>
      {msg && <p role="status" className="mt-4 text-caramel font-semibold">{msg}</p>}
      {tab === "invoice" && <InvoicePanel />}
      {tab === "members" && <section className="mt-6">
        <form onSubmit={e => { e.preventDefault(); members(q); }} className="flex flex-wrap gap-3">
          <input className={inp + " flex-1 min-w-[10rem]"} placeholder="ابحث بالاسم أو اليوزر" value={q} onChange={e => setQ(e.target.value)} />
          <select className={inp} value={roleF} onChange={e => setRoleF(e.target.value)}><option value="">كل الأدوار</option><option value="member">أعضاء</option><option value="staff">موظفين</option><option value="admin">أدمن</option></select>
          <select className={inp} value={statF} onChange={e => setStatF(e.target.value)}><option value="">كل الحالات</option><option value="act">نشط</option><option value="sus">موقوف</option></select>
          <select className={inp} value={sort} onChange={e => setSort(e.target.value)}><option value="created_at">الأحدث</option><option value="points">النقاط</option><option value="visits">الزيارات</option></select></form>
        {ms === null ? <p className="mt-6 text-roast/60">بنحمّل...</p> : shown.length === 0 ? <p className="mt-6">مفيش نتائج.</p> :
          <ul className="mt-4">{shown.map(m => (
            <li key={m.id} className="py-4 border-b border-sand">
              <button onClick={() => toggle(m)} className="w-full text-right">
                <span className="font-bold">{m.display_name}</span> <span className="text-xs text-roast/60" dir="ltr">@{m.username}</span>
                <span className="text-xs mx-2 text-brass font-bold">{RL[m.role]}</span>{m.suspended && <span className="text-xs text-caramel">موقوف</span>}
                <div className="text-xs text-roast/70 num">{ar(m.points)} نقطة · {ar(m.visits)} زيارة · ستريك {ar(m.streak)} · سجّل {new Date(m.created_at).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" })}</div></button>
              {open === m.id && <div className="mt-3 text-sm bg-sand/50 p-4">
                <p className="text-roast/70">آخر زيارات: {det.length ? det.map(d => ar(d)).join(" · ") : "لسه مفيش"}</p>
                {m.role !== "admin" && m.id !== meId ? <div className="mt-3 flex flex-wrap items-center gap-4">
                  <select value={m.role} onChange={e => rpc("admin_set_role", { uid: m.id, r: e.target.value })} className={inp}><option value="member">عضو</option><option value="staff">موظف</option><option value="admin">أدمن</option></select>
                  <button onClick={() => rpc("admin_set_suspended", { uid: m.id, s: !m.suspended })} className="underline">{m.suspended ? "إعادة تفعيل" : "إيقاف"}</button>
                  <button onClick={() => setModal({ k: "pw", m })} className="underline">تغيير الباسورد</button>
                  <button onClick={() => setModal({ k: "del", m })} className="underline text-caramel">حذف</button></div> : <p className="mt-2 text-roast/60">حسابات الأدمن محمية من التعديل هنا.</p>}
              </div>}
            </li>))}</ul>}</section>}
      {tab === "audit" && <ul className="mt-6 text-sm">{audit.length === 0 ? <p>السجل فاضي.</p> : audit.map(r => <li key={r.id} className="py-3 border-b border-sand">
        <b>{ACT[r.action] ?? r.action}</b> · {r.actor_name ?? "نظام"}{r.target_name ? ` ← ${r.target_name}` : ""}
        <span className="block text-xs text-roast/60 num" dir="ltr" style={{ textAlign: "right" }}>{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}</span></li>)}</ul>}
      {tab === "settings" && <form onSubmit={save} className="mt-6 space-y-6 max-w-xs">
        <label className="block">نقاط كل زيارة (١–١٠٠)<input type="number" min={1} max={100} className={inp + " w-full block"} value={cfg.pts} onChange={e => setCfg({ ...cfg, pts: +e.target.value })} /></label>
        <label className="block">أيام الستريك للمشروب (٢–٣٠)<input type="number" min={2} max={30} className={inp + " w-full block"} value={cfg.target} onChange={e => setCfg({ ...cfg, target: +e.target.value })} /></label>
        <button className="bg-espresso text-cream font-bold px-6 py-3">حفظ</button></form>}
      {modal && <div className="fixed inset-0 z-50 bg-espresso/70 grid place-items-center p-6" role="dialog" aria-modal>
        <form onSubmit={submitModal} className="bg-cream p-6 w-full max-w-sm space-y-4">
          <h2 className="text-xl font-black">{modal.k === "pw" ? "باسورد جديد" : "تأكيد الحذف"} لـ {modal.m.display_name}</h2>
          {modal.k === "pw" ? <>
            <input type="password" dir="ltr" autoComplete="new-password" className={inp + " w-full"} placeholder="الباسورد الجديد" value={p1} onChange={e => setP1(e.target.value)} />
            <input type="password" dir="ltr" autoComplete="new-password" className={inp + " w-full"} placeholder="تأكيد الباسورد" value={p2} onChange={e => setP2(e.target.value)} /></>
            : <p className="leading-7">هيتحذف الحساب وكل زياراته ونقاطه نهائيًا، واليوزر هيبقى متاح تاني. متأكد؟</p>}
          {msg && <p className="text-caramel text-sm">{msg}</p>}
          <div className="flex gap-3"><button disabled={busy} className="flex-1 bg-espresso text-cream font-bold py-3 disabled:opacity-50">{busy ? "لحظة..." : modal.k === "pw" ? "حفظ" : "احذف"}</button>
            <button type="button" onClick={() => { setModal(null); setMsg(""); }} className="flex-1 border border-espresso py-3">إلغاء</button></div>
        </form></div>}
    </main>);
}
export default function Page() { return <Gate need="admin">{me => <Admin meId={me.id} />}</Gate>; }

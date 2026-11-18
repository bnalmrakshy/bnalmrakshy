"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb, logout } from "@/lib/supabase";
export type Me = { id: string; username: string; display_name: string; role: string; streak: number; suspended: boolean };
export default function Gate({ need, soft, children }: { need?: "staff" | "admin"; soft?: boolean; children: (me: Me) => React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null); const [st, setSt] = useState<"load" | "guest" | "err" | "deny" | "ok">("load");
  const [em, setEm] = useState("");
  useEffect(() => { (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { if (soft) return setSt("guest"); location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    await sb.rpc("ensure_profile");
    const { data, error } = await sb.from("profiles").select("id,username,display_name,role,streak,suspended").eq("id", session.user.id).single();
    if (error || !data) { setEm(error?.message ?? "مفيش بروفايل للحساب ده"); return setSt("err"); }
    const ok = !need || (need === "staff" ? data.role !== "member" : data.role === "admin");
    if (data.suspended || !ok) return setSt("deny");
    setMe(data); setSt("ok");
  })(); }, [need, soft]);
  const box = "px-6 py-20 max-w-md mx-auto leading-8";
  if (st === "load") return <main className="min-h-[60vh] grid place-items-center text-roast">لحظة...</main>;
  if (st === "guest") return <div className={box}><p>سجّل دخولك عشان تشوف مكافآتك.</p><Link href="/login?next=/rewards" className="underline font-bold">دخول</Link> · <Link href="/register" className="underline font-bold">حساب جديد</Link></div>;
  if (st === "err") return <main className={box}><p>مقدرناش نحمّل حسابك.</p>{process.env.NODE_ENV !== "production" && <p className="text-xs text-roast/60" dir="ltr">{em}</p>}<button onClick={logout} className="underline font-bold">سجّل خروج وادخل تاني</button></main>;
  if (st === "deny") return <main className={box}><p>مش مسموح لك تدخل الصفحة دي.</p></main>;
  return <>{children(me!)}</>;
}

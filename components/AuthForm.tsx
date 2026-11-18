"use client";
import { useState } from "react";
import { sb, emailOf, safeNext } from "@/lib/supabase";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const reg = mode === "register";
  const [f, setF] = useState({ name: "", user: "", pass: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (reg && !/^[a-z0-9_]{3,20}$/i.test(f.user)) return setErr("اليوزر حروف إنجليزي وأرقام و _ فقط (٣ لـ ٢٠).");
    if (reg && f.name.trim().length < 2) return setErr("اكتب اسم العرض.");
    if (f.pass.length < 8) return setErr("الباسورد لازم ٨ حروف على الأقل.");
    setBusy(true);
    const email = emailOf(f.user);
    const { data, error } = reg
      ? await sb.auth.signUp({ email, password: f.pass, options: { data: { username: f.user.toLowerCase(), display_name: f.name.trim() } } })
      : await sb.auth.signInWithPassword({ email, password: f.pass });
    setBusy(false);
    if (error) return setErr(/already|registered|database error|duplicate/i.test(error.message) ? "اليوزر ده مستخدم، جرّب غيره." : reg ? "حصلت مشكلة، جرّب تاني." : "اليوزر أو الباسورد غلط.");
    if (reg && !data?.session) return setErr("الحساب اتعمل بس مش مفتوح. لازم تعطّل Confirm email من Supabase.");
    if (reg) { const { data: ok, error: e2 } = await sb.rpc("ensure_profile"); if (e2 || !ok) { await sb.auth.signOut(); return setErr("الحساب اتعمل بس البروفايل ماتعملش. كلّم الإدارة."); } }
    location.href = safeNext(new URLSearchParams(location.search).get("next"));
  }
  const inp = "w-full bg-transparent border-b border-roast/30 py-3 text-lg outline-none focus:border-brass";
  return (
    <main className="min-h-[80vh] px-6 py-14 max-w-md mx-auto">
      <p className="text-brass font-bold text-sm">المراكشي ستريك</p>
      <h1 className="text-4xl font-black mt-2">{reg ? "ابدأ الستريك" : "أهلًا بيك تاني"}</h1>
      <form onSubmit={submit} className="mt-10 space-y-7">
        {reg && <input className={inp} placeholder="اسمك اللي هيظهر" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={24} />}
        <input className={inp} dir="ltr" style={{ textAlign: "right" }} placeholder="اليوزر" autoCapitalize="none" autoComplete="username" value={f.user} onChange={e => setF({ ...f, user: e.target.value })} />
        <input className={inp} dir="ltr" style={{ textAlign: "right" }} type="password" placeholder="الباسورد" autoComplete={reg ? "new-password" : "current-password"} value={f.pass} onChange={e => setF({ ...f, pass: e.target.value })} />
        {err && <p role="alert" className="text-caramel font-semibold">{err}</p>}
        <button disabled={busy} className="w-full bg-espresso text-cream font-bold py-4 active:scale-[.98] transition disabled:opacity-50">{busy ? "لحظة..." : reg ? "إنشاء الحساب" : "دخول"}</button>
      </form>
      <a href={reg ? "/login" : "/register"} className="block mt-6 text-sm text-roast underline">{reg ? "عندي حساب" : "معييش حساب"}</a>
      <p className="mt-8 text-xs text-roast/60 leading-6">نسيت الباسورد؟ اطلب من الكاشير يعيّن لك واحد جديد.</p>
    </main>
  );
}

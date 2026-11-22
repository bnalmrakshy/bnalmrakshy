"use client";
import { useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icons";
import PasswordInput from "@/components/PasswordInput";
import LocationCard from "@/components/LocationCard";
import { sb, logout } from "@/lib/supabase";
const MSG: Record<string, string> = { "too soon": "تقدر تغيّر اليوزر مرة كل ٧ أيام.", taken: "اليوزر ده مستخدم.", "bad username": "اليوزر حروف إنجليزي وأرقام و _ فقط (٣ لـ ٢٠).", "bad name": "الاسم من ٢ لـ ٢٤ حرف." };
function P({ me }: { me: Me }) {
  const [f, setF] = useState({ name: "", user: "" }); const [av, setAv] = useState<string | null>(null); const [changed, setChanged] = useState<string | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [pw, setPw] = useState({ a: "", b: "" }); const [pmsg, setPmsg] = useState("");
  useEffect(() => { sb.from("profiles").select("username,display_name,avatar_url,username_changed_at").eq("id", me.id).single().then(r => { if (r.data) { setF({ name: r.data.display_name, user: r.data.username }); setAv(r.data.avatar_url); setChanged(r.data.username_changed_at); } }); }, [me.id]);
  const nextChange = changed && +new Date(changed) + 7 * 864e5 > Date.now() ? new Date(+new Date(changed) + 7 * 864e5).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" }) : null;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(""); const { error } = await sb.rpc("update_profile", { new_name: f.name, new_username: f.user }); setBusy(false);
    setMsg(error ? (MSG[Object.keys(MSG).find(k => error.message.includes(k)) ?? ""] ?? "حصلت مشكلة، جرّب تاني.") : "اتحفظ.");
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setPmsg("");
    if (!(pw.a.length >= 8 && /[A-Za-z]/.test(pw.a) && /\d/.test(pw.a))) return setPmsg("الباسورد ٨ على الأقل، وفيه حروف إنجليزي وأرقام مع بعض.");
    if (pw.a !== pw.b) return setPmsg("الباسوردين مش متطابقين.");
    setBusy(true); const { error } = await sb.auth.updateUser({ password: pw.a }); setBusy(false);
    if (error) return setPmsg("تعذّر تغيير الباسورد. سجّل خروج وادخل تاني وجرّب.");
    setPw({ a: "", b: "" }); setPmsg("اتغيّر الباسورد.");
  }
  async function pick(file?: File) {
    if (!file) return; setMsg("");
    if (file.size > 8e6 || !file.type.startsWith("image/")) return setMsg("اختار صورة أقل من ٨ ميجا.");
    setBusy(true);
    try {
      const bmp = await createImageBitmap(file); const s = Math.min(bmp.width, bmp.height); const c = document.createElement("canvas"); c.width = c.height = 256;
      c.getContext("2d")!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
      const blob: Blob = await new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error("x")), "image/jpeg", .85));
      const path = `${me.id}/avatar.jpg`; const up = await sb.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
      const r = await sb.rpc("set_avatar", { url }); if (r.error) throw r.error; setAv(url); setMsg("اتغيّرت الصورة.");
    } catch { setMsg("مقدرناش نرفع الصورة، جرّب صورة تانية."); }
    setBusy(false);
  }
  const lab = "block text-xs font-bold text-roast";
  return (
    <main className="mx-auto max-w-lg px-5 pt-6 pb-4">
      <div className="text-center">
        <label className="relative inline-block cursor-pointer"><span className="block rounded-full ring-4 ring-brass"><Avatar url={av} size={112} /></span>
          <span className="absolute bottom-0 left-0 w-9 h-9 rounded-full bg-espresso text-cream border-4 border-white grid place-items-center"><Icon name="camera" size={16} /></span>
          <input type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} /></label>
        <h1 className="mt-4 text-2xl font-black">{f.name || me.display_name}</h1><p className="text-roast text-sm" dir="ltr">@{f.user}</p>
      </div>
      <form onSubmit={save} className="mt-8 rounded-3xl bg-sand/60 p-5 space-y-4">
        <h2 className="font-black">بياناتك</h2>
        <label className={lab}>اسمك (تقدر تغيّره في أي وقت)<input className="mt-1.5 w-full text-base" value={f.name} maxLength={24} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className={lab}>اليوزر {nextChange ? `(تقدر تغيّره بعد ${nextChange})` : "(مرة كل ٧ أيام)"}
          <input className="mt-1.5 w-full text-base" dir="ltr" style={{ textAlign: "right" }} autoCapitalize="none" value={f.user} disabled={!!nextChange} onChange={e => setF({ ...f, user: e.target.value })} /></label>
        <button disabled={busy} className="w-full bg-espresso text-cream font-bold py-3.5 disabled:opacity-50 active:scale-[.98] transition">حفظ</button>
        {msg && <p role="status" className="text-caramel font-semibold text-sm">{msg}</p>}
      </form>
      <form onSubmit={changePw} className="mt-4 rounded-3xl bg-sand/60 p-5 space-y-4">
        <h2 className="font-black">الباسورد</h2>
        <PasswordInput className="w-full text-base" autoComplete="new-password" placeholder="باسورد جديد (حروف + أرقام)" value={pw.a} onChange={e => setPw({ ...pw, a: e.target.value })} />
        <PasswordInput className="w-full text-base" autoComplete="new-password" placeholder="أكّد الباسورد" value={pw.b} onChange={e => setPw({ ...pw, b: e.target.value })} />
        <button disabled={busy} className="w-full border border-espresso font-bold py-3.5 disabled:opacity-50 active:scale-[.98] transition">غيّر الباسورد</button>
        {pmsg && <p role="status" className="text-caramel font-semibold text-sm">{pmsg}</p>}
        <p className="text-xs text-roast/70 leading-6">نسيت باسوردك؟ اطلب من الإدارة تعيّن لك واحد جديد.</p>
      </form>
      <LocationCard id={me.id} />
      <button onClick={logout} className="mt-5 w-full py-3.5 font-bold text-roast">تسجيل خروج</button>
    </main>);
}
export default function Page() { return <Gate>{me => <P me={me} />}</Gate>; }

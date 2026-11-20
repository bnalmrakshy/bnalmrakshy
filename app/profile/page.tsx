"use client";
import { useEffect, useState } from "react";
import Gate, { Me } from "@/components/Gate";
import Avatar from "@/components/Avatar";
import { sb } from "@/lib/supabase";
const MSG: Record<string, string> = { "too soon": "تقدر تغيّر اليوزر مرة كل ٧ أيام.", taken: "اليوزر ده مستخدم.", "bad username": "اليوزر حروف إنجليزي وأرقام و _ فقط (٣ لـ ٢٠).", "bad name": "الاسم من ٢ لـ ٢٤ حرف." };
function P({ me }: { me: Me }) {
  const [f, setF] = useState({ name: "", user: "" }); const [av, setAv] = useState<string | null>(null); const [changed, setChanged] = useState<string | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from("profiles").select("username,display_name,avatar_url,username_changed_at").eq("id", me.id).single().then(r => { if (r.data) { setF({ name: r.data.display_name, user: r.data.username }); setAv(r.data.avatar_url); setChanged(r.data.username_changed_at); } }); }, [me.id]);
  const nextChange = changed && +new Date(changed) + 7 * 864e5 > Date.now() ? new Date(+new Date(changed) + 7 * 864e5).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" }) : null;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(""); const { error } = await sb.rpc("update_profile", { new_name: f.name, new_username: f.user }); setBusy(false);
    setMsg(error ? (MSG[Object.keys(MSG).find(k => error.message.includes(k)) ?? ""] ?? "حصلت مشكلة، جرّب تاني.") : "اتحفظ.");
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
  const inp = "w-full bg-transparent border-b border-roast/30 py-3 text-lg outline-none focus:border-brass";
  return (
    <main className="px-6 py-12 max-w-md mx-auto">
      <h1 className="text-3xl font-black">تعديل حسابي</h1>
      <div className="mt-6 flex items-center gap-4"><Avatar url={av} size={80} />
        <label className="border border-espresso px-4 py-2 font-bold cursor-pointer active:bg-sand">غيّر الصورة<input type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} /></label></div>
      <form onSubmit={save} className="mt-8 space-y-7">
        <label className="block text-sm text-roast">اسمك (تقدر تغيّره في أي وقت)<input className={inp} value={f.name} maxLength={24} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="block text-sm text-roast">اليوزر {nextChange ? `(تقدر تغيّره تاني بعد ${nextChange})` : "(تقدر تغيّره كل ٧ أيام)"}
          <input className={inp} dir="ltr" style={{ textAlign: "right" }} autoCapitalize="none" value={f.user} disabled={!!nextChange} onChange={e => setF({ ...f, user: e.target.value })} /></label>
        <button disabled={busy} className="w-full bg-espresso text-cream font-bold py-4 disabled:opacity-50">{busy ? "لحظة..." : "حفظ"}</button>
      </form>
      {msg && <p role="status" className="mt-4 text-caramel font-semibold">{msg}</p>}
    </main>);
}
export default function Page() { return <Gate>{me => <P me={me} />}</Gate>; }

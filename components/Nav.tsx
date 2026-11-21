"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icons";
import { sb } from "@/lib/supabase";
import { SOCIAL } from "@/lib/config";
const tabs = [["/", "الرئيسية", "home"], ["/menu", "المنيو", "cup"], ["/scan", "مسح", "qr"], ["/leaderboard", "الدوري", "trophy"], ["/club", "حسابي", "user"]] as const;
export default function Nav() {
  const p = usePathname(); const [av, setAv] = useState<string | null>(null); const [auth, setAuth] = useState(false);
  useEffect(() => { sb.auth.getSession().then(async ({ data: { session } }) => {
    setAuth(!!session); if (!session) return setAv(null);
    const r = await sb.from("profiles").select("avatar_url").eq("id", session.user.id).single(); setAv(r.data?.avatar_url ?? null);
  }); }, [p]);
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sand pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl lg:px-8 h-14 px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg"><Logo size={30} />المراكشي</Link>
          <nav className="hidden lg:flex items-center gap-1">{tabs.map(([h, l]) => <Link key={h} href={h} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${p === h ? "bg-sand text-espresso" : "text-roast hover:bg-sand/60"}`}>{l}</Link>)}</nav>
          <div className="flex items-center gap-3">
            {SOCIAL.facebook && <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className="w-9 h-9 rounded-full bg-sand text-espresso grid place-items-center active:scale-90 transition"><Icon name="fb" size={18} /></a>}
            <Link href={auth ? "/club" : "/login"} aria-label="حسابي" className="active:scale-90 transition"><Avatar url={av} size={36} /></Link>
          </div>
        </div>
      </header>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand rounded-t-3xl shadow-[0_-6px_24px_rgba(0,0,0,.07)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-lg grid grid-cols-5 items-end px-2">
          {tabs.map(([h, l, ic]) => h === "/scan" ? (
            <Link key={h} href={h} aria-label="مسح فاتورة" className="flex flex-col items-center pb-2 text-[11px] font-bold">
              <span className="-mt-6 w-14 h-14 rounded-full bg-espresso text-cream grid place-items-center shadow-lg border-4 border-white active:scale-90 transition"><Icon name="qr" size={26} /></span>{l}</Link>
          ) : (
            <Link key={h} href={h} onClick={() => navigator.vibrate?.(8)} className={`relative flex flex-col items-center gap-1 py-3 text-[11px] font-bold active:scale-95 transition ${p === h ? "text-espresso" : "text-roast/50"}`}>
              <Icon name={ic} size={23} />{l}{p === h && <motion.span layoutId="tab" transition={{ type: "spring", stiffness: 500, damping: 35 }} className="absolute top-1.5 inset-x-3 h-[52px] rounded-2xl bg-sand -z-10" />}</Link>))}
        </div>
      </nav>
    </>);
}

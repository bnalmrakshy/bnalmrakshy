"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [["/","الرئيسية"],["/leaderboard","المتصدرين"],["/rewards","المكافآت"],["/club","حسابي"]] as const;
export default function Nav() {
  const p = usePathname();
  return (
    <>
      <header className="hidden md:flex items-center justify-between px-10 py-5 border-b border-sand">
        <Link href="/" className="text-xl font-black">المراكشي</Link>
        <nav className="flex gap-8 text-sm font-semibold">
          {items.map(([h,l]) => <Link key={h} href={h} className={p===h?"text-caramel":"text-roast"}>{l}</Link>)}
        </nav>
      </header>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-espresso grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map(([h,l]) => (
          <Link key={h} href={h} className={`relative py-4 text-center text-[13px] font-semibold active:opacity-70 ${p===h?"text-brass":"text-cream/80"}`}>
            {p===h && <span className="absolute top-0 inset-x-6 h-[3px] bg-brass" />}{l}
          </Link>
        ))}
      </nav>
    </>
  );
}

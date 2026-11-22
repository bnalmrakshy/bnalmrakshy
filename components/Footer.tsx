"use client";
import { usePathname } from "next/navigation";
import { SOCIAL } from "@/lib/config";
const FB = "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z";
export default function Footer() {
  const p = usePathname();
  if (!SOCIAL.facebook || ["/pos", "/office", "/admin", "/checkin", "/scan", "/login", "/register"].some(x => p.startsWith(x))) return null;
  return (
    <footer className="mx-auto max-w-6xl px-5 lg:px-8 pt-8 pb-4">
      <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-3xl bg-espresso text-cream p-5 active:scale-[.98] transition hover:shadow-lg">
        <svg viewBox="0 0 24 24" width="46" height="46" fill="#FFFFFF" aria-hidden><path d={FB} /></svg>
        <span className="flex-1"><span className="block font-black text-lg">تابعنا على فيسبوك</span><span className="block text-sm text-cream/60">أخبار وعروض المراكشي أول بأول</span></span>
        <span className="text-xl" aria-hidden>←</span></a>
      <p className="mt-4 text-center text-xs text-roast/60">المراكشي · <a href="/privacy" className="underline">الخصوصية</a></p>
    </footer>);
}

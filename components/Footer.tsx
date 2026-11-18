import { SOCIAL } from "@/lib/config";
const L: [keyof typeof SOCIAL, string][] = [["facebook", "فيسبوك"], ["instagram", "إنستجرام"], ["tiktok", "تيك توك"], ["whatsapp", "واتساب"]];
export default function Footer() {
  const links = L.filter(([k]) => SOCIAL[k]);
  return (
    <footer className="border-t border-sand px-6 py-8 md:px-16 text-sm text-roast">
      {links.length > 0 && <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3"><span className="font-bold">تابعنا</span>
        {links.map(([k, l]) => <a key={k} href={SOCIAL[k]} target="_blank" rel="noopener noreferrer" className="underline active:opacity-60">{l}</a>)}</div>}
      <p className="text-roast/60">المراكشي ستريك · كل زيارة تعلي صدارتك.</p>
    </footer>
  );
}

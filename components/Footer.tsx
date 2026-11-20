import { SOCIAL } from "@/lib/config";
import Icon from "@/components/Icons";
const L = [["facebook", "fb", "فيسبوك"], ["instagram", "ig", "إنستجرام"], ["whatsapp", "chat", "واتساب"]] as const;
export default function Footer() {
  const links = L.filter(([k]) => SOCIAL[k]);
  if (!links.length) return null;
  return <div className="flex justify-center gap-3 py-8">{links.map(([k, ic, label]) => (
    <a key={k} href={SOCIAL[k]} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-11 h-11 rounded-full bg-espresso text-cream grid place-items-center active:scale-90 transition">
      <Icon name={ic} size={20} /></a>))}</div>;
}

const P: Record<string, string> = {
  mug: "M5 9h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h2a2 2 0 0 1 0 4h-2M8 4c0 1.2 1 1.2 1 2.4M12 4c0 1.2 1 1.2 1 2.4",
  latte: "M5 10h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 12h2a2 2 0 0 1 0 4h-2M7 13c1-1 2 1 3 0s2 1 3 0M9 4c0 1.2 1 1.2 1 2.4",
  espresso: "M6 12h9v2a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4zM15 13h1.5a1.5 1.5 0 0 1 0 3H15M4 21h13M10 6c0 1 1 1 1 2.4",
  cezve: "M8 9h8l-1 8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM8 9c0-1.3 1.2-2 4-2s4 .7 4 2M16 10h3v4h-2M12 3v4",
  tea: "M7 7h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zM7 11h10M12 3v4",
  cold: "M7 6h10l-1.5 13a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8zM9 6l1-3h5M7.5 11h9",
  snack: "M3 15c0-4 4-7 9-7s9 3 9 7zM3 15h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  bag: "M7 8h10l1 12H6zM9 8c0-2.5 1-4 3-4s3 1.500 3 4M10 14c1-1.200 3-1.200 4 0s0 3-2 3-3-1.800-2-3z",
};
export const artKey = (name: string, cat: string) => /ساقع|ايس|آيس|عصير|ميلك|سموذي|موهيتو|كولد/.test(name + cat) ? "cold" : /سناك|سندوتش|ساندوتش|كرواسون|كيك|بسكوت|تورتة|وجبة|بيتزا|برجر|فطير|دونات|حلويات|مخبوزات|أكل/.test(name + cat) ? "snack" : /بن|فليفر/.test(cat) ? "bag" : /شاي/.test(name) ? "tea" : /كابتشينو|لاتيه/.test(name) ? "latte" : /اسبريسو/.test(name) ? "espresso" : /تركي|فرنساوي|قهوة/.test(name) ? "cezve" : "mug";
export default function ItemArt({ name, cat, size = 56 }: { name: string; cat: string; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="shrink-0 rounded-2xl bg-white grid place-items-center text-roast">
      <svg viewBox="0 0 24 24" width={size * .55} height={size * .55} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[artKey(name, cat)]} /></svg>
    </span>);
}

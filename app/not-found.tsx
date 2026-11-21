import Link from "next/link";
export default function NotFound() {
  return <main className="min-h-[60vh] grid place-items-center px-6 text-center"><div><p className="text-6xl font-black">٤٠٤</p><p className="text-roast mt-2">الصفحة دي مش موجودة.</p><Link href="/" className="inline-block mt-5 bg-espresso text-cream font-bold px-6 py-3">الرئيسية</Link></div></main>;
}

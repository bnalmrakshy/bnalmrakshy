"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main className="min-h-[60vh] grid place-items-center px-6 text-center"><div><p className="text-xl font-black">حصلت مشكلة غير متوقعة</p><p className="text-roast mt-2">بياناتك في أمان. جرّب تاني.</p><button onClick={reset} className="mt-5 bg-espresso text-cream font-bold px-6 py-3">جرّب تاني</button></div></main>;
}

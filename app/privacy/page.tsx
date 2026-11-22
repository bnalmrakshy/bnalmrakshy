export const metadata = { title: "الخصوصية — المراكشي" };
export default function Privacy() {
  const S = ({ t, children }: { t: string; children: React.ReactNode }) => <section className="mt-6"><h2 className="font-black text-lg">{t}</h2><div className="mt-2 text-roast leading-8 text-sm">{children}</div></section>;
  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-4"><h1 className="text-3xl font-black">الخصوصية</h1><p className="mt-2 text-roast text-sm">بنحترم بياناتك. دي الصورة المختصرة.</p>
      <S t="إيه اللي بنجمعه">اسمك واليوزر، وفواتيرك ونقاطك. وموقعك التقريبي لو سمحت بيه (منطقة أو إحداثيات مقرّبة لحوالي ٥٠٠ متر، مش عنوانك بالظبط).</S>
      <S t="ليه">عشان نحسب نقاطك ونعرض لك أقرب فرع ونجهّز التوصيل، وعشان نفهم المحل بيشتغل إزاي ونحسّنه.</S>
      <S t="التحليل والبحث">ممكن نستخدم البيانات في تحليلات وأبحاث بعد ما نشيل منها أي حاجة تدل عليك (الاسم واليوزر والتليفون). مش بنبيع بياناتك لأي حد.</S>
      <S t="حقوقك">الموقع اختياري، وتقدر تمسحه في أي وقت من «تعديل حسابي». وتقدر تطلب حذف حسابك وبياناتك.</S>
    </main>);
}

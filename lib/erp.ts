export const M = (n: any) => Number(n ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
export const METHOD: Record<string, string> = { cash: "كاش", card: "فيزا", instapay: "إنستاباي", credit: "آجل" };
export const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const clean = (s: string) => s.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31);
const tm = (t: string | null) => (t ? new Date(t).toLocaleString("en-GB", { timeZone: "Africa/Cairo" }) : "");
// تصدير الجرد: كل شيت اسمه بيحتوي على المدة (الحد الأقصى لاسم الشيت ٣١ حرف)
export async function exportReport(d: any, from: string, to: string, shiftLabel: string) {
  const X = await import("xlsx"); const tag = from === to ? from.slice(5) : `${from.slice(5)} الى ${to.slice(5)}`;
  const wb = X.utils.book_new(); (wb as any).Workbook = { Views: [{ RTL: true }] };
  const add = (name: string, rows: any[]) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.length ? rows : [{ "—": "لا بيانات" }]), clean(`${name} ${tag}`));
  const s = d.summary;
  add("ملخص", [{ "الفترة": `${from} → ${to}`, "الشيفت": shiftLabel, "المبيعات بعد الخصم": s.sales, "عدد الفواتير": s.count, "الإجمالي قبل الخصم": s.gross, "خصم النقاط": s.discount, "التكلفة": s.cost, "الربح التقديري": s.sales - s.cost, "مستحق على العملاء": d.balances.customers, "مستحق للموردين": d.balances.suppliers }]);
  add("طرق الدفع", d.by_method.map((x: any) => ({ "الطريقة": METHOD[x.method] ?? x.method, "العدد": x.n, "المبلغ": x.amount })));
  add("الكاشير", d.by_cashier.map((x: any) => ({ "الكاشير": x.cashier, "الفواتير": x.n, "المبيعات": x.amount })));
  add("الأصناف", d.items.map((x: any) => ({ "الصنف": x.name, "الكمية": x.qty, "الإيراد": x.revenue, "الربح": x.profit })));
  add("الفواتير", d.sales.map((x: any) => ({ "رقم": String(x.id).slice(0, 8), "الوقت": tm(x.paid_at), "الكاشير": x.cashier, "الدفع": METHOD[x.method] ?? x.method, "الإجمالي": x.total, "الخصم": x.discount, "المدفوع": x.paid_amount, "العميل": x.customer ?? "" })));
  add("المشتريات", d.purchases.map((x: any) => ({ "رقم": x.id, "الوقت": tm(x.created_at), "النوع": x.kind === "purchase" ? "مشتريات" : "مرتجع", "المورد": x.supplier, "الإجمالي": x.total, "المدفوع": x.paid, "ملاحظة": x.note ?? "" })));
  add("السندات", d.vouchers.map((x: any) => ({ "رقم": x.id, "الوقت": tm(x.created_at), "النوع": x.kind === "in" ? "قبض" : "صرف", "الحساب": x.account, "المبلغ": x.amount, "ملاحظة": x.note ?? "" })));
  add("المخزون", d.stock.map((x: any) => ({ "القسم": x.category, "الصنف": x.name, "الكمية": x.stock, "التكلفة": x.cost, "السعر": x.price, "قيمة المخزون": x.value })));
  add("الخزن", d.treasury.map((x: any) => ({ "الحساب": x.name, "الرصيد": x.balance })));
  add("الشيفتات", d.shifts.map((x: any) => ({ "رقم": x.id, "الكاشير": x.cashier_name, "فتح": tm(x.opened_at), "قفل": tm(x.closed_at), "افتتاحي": x.opening_cash, "المتوقع": x.expected_cash, "المعدود": x.counted_cash, "الفرق": x.diff })));
  X.writeFile(wb, `جرد_${from}_الى_${to}.xlsx`);
}

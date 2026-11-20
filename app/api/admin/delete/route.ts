import { NextResponse } from "next/server";
import { requireAdmin, target, isUuid } from "@/lib/adminServer";
const no = (m: string, c: number) => NextResponse.json({ error: m }, { status: c });
export async function POST(req: Request) {
  try {
    const a = await requireAdmin(req);
    if (!a) return no("غير مسموح", 403);
    const { userId } = await req.json().catch(() => ({}));
    if (!isUuid(userId)) return no("بيانات غير صالحة", 400);
    const t = await target(a.s, userId);
    if (!t || t.role === "developer" || (t.role === "admin" && a.role !== "developer") || t.id === a.uid) return no("مش مسموح بحذف الحساب ده", 403);
    const { error } = await a.s.auth.admin.deleteUser(userId); // يحذف من Auth، والـ cascade بيمسح البروفايل وبياناته
    await a.s.from("audit_logs").insert({ actor: a.uid, action: error ? "admin_delete_failed" : "admin_delete_user", detail: { target: userId, username: t.username } });
    return error ? no("فشل الحذف", 500) : NextResponse.json({ ok: true });
  } catch { return no("خطأ في السيرفر", 500); }
}

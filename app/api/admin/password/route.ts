import { NextResponse } from "next/server";
import { requireAdmin, target, isUuid } from "@/lib/adminServer";
const no = (m: string, c: number) => NextResponse.json({ error: m }, { status: c });
export async function POST(req: Request) {
  try {
    const a = await requireAdmin(req);
    if (!a) return no("غير مسموح", 403);
    const { userId, password } = await req.json().catch(() => ({}));
    if (!isUuid(userId) || typeof password !== "string" || password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return no("بيانات غير صالحة", 400);
    const t = await target(a.s, userId);
    if (!t || t.role === "admin" || t.id === a.uid) return no("مش مسموح بتغيير الباسورد ده من هنا", 403);
    const { error } = await a.s.auth.admin.updateUserById(userId, { password });
    await a.s.from("audit_logs").insert({ actor: a.uid, action: "admin_set_password", detail: { target: userId, username: t.username, ok: !error } });
    return error ? no("فشل تغيير الباسورد", 500) : NextResponse.json({ ok: true });
  } catch { return no("خطأ في السيرفر", 500); }
}

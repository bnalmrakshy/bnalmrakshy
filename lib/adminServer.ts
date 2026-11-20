import { createClient } from "@supabase/supabase-js";
// السيرفر فقط. SUPABASE_SERVICE_ROLE_KEY ممنوع يبدأ بـ NEXT_PUBLIC.
export function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
// يتحقق من الجلسة (Bearer token مش cookie، فمفيش CSRF) ومن إن المنفّذ أدمن غير موقوف.
export async function requireAdmin(req: Request) {
  const tok = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!tok) return null;
  const s = svc();
  const { data: { user } } = await s.auth.getUser(tok);
  if (!user) return null;
  const { data: p } = await s.from("profiles").select("role,suspended").eq("id", user.id).single();
  return p && (p.role === "admin" || p.role === "developer") && !p.suspended ? { s, uid: user.id, role: p.role as string } : null;
}
export async function target(s: ReturnType<typeof svc>, id: string) {
  const { data } = await s.from("profiles").select("id,username,role").eq("id", id).single();
  return data;
}

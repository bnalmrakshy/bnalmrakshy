import { createClient } from "@supabase/supabase-js";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-key";
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost", key);
export const emailOf = (u: string) => `${u.trim().toLowerCase()}@users.almarrakshi.app`;
export const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");
export async function logout() { await sb.auth.signOut(); location.href = "/"; }
export const cairoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
export const isFriday = () => new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "Africa/Cairo" }).format(new Date()) === "Friday";
export const ar = (n: number | string) => Number(n).toLocaleString("ar-EG");

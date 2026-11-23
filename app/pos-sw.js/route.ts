export const dynamic = "force-static";
// Service Worker للكاشير فقط: بيخزّن ملفات التطبيق عشان الصفحة تفتح حتى لو النت قطع (مش بيخزّن بيانات Supabase)
const SW = `
const C = "pos-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.pathname.startsWith("/_next/static")) { e.respondWith(caches.open(C).then(async c => (await c.match(r)) || fetch(r).then(x => { if (x.ok) c.put(r, x.clone()); return x; }))); return; }
  if (r.mode === "navigate" && u.pathname.startsWith("/pos")) e.respondWith(fetch(r).then(x => { if (x.ok) caches.open(C).then(c => c.put(r, x.clone())); return x; }).catch(() => caches.match(r)));
});`;
export function GET() { return new Response(SW, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" } }); }

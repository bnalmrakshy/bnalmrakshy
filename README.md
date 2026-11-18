# المراكشي ستريك
1. `npm install`
2. Supabase SQL Editor: شغّل `supabase/schema.sql` ثم `supabase/migrations/002_admin_and_hardening.sql`. عطّل Confirm email.
3. `.env.local` (شوف .env.example، وSUPABASE_SERVICE_ROLE_KEY للسيرفر فقط): NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (أو ANON_KEY القديم).
4. `npm run dev`
5. أول أدمن: سجّل حساب ثم `update profiles set role='admin' where username='...';`
6. حساب موظف: سجّله من /register ثم من /admin (الأعضاء) غيّر دوره لموظف.

7. ترتيب SQL: schema.sql ← 002 ← 003 ← diagnose_orphans.sql (قراءة) ← 004 (إصلاح اليتامى بعد مراجعة التقرير)

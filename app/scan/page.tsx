"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Gate from "@/components/Gate";
function tokenOf(raw: string) {
  try { return new URL(raw).searchParams.get("t"); } catch { return /^[a-f0-9]{32}$/i.test(raw.trim()) ? raw.trim() : null; }
}
function Scanner() {
  const v = useRef<HTMLVideoElement>(null); const [err, setErr] = useState(""); const [ready, setReady] = useState(false); const [bad, setBad] = useState(false);
  useEffect(() => {
    let stream: MediaStream | undefined, timer: ReturnType<typeof setTimeout>, done = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setErr("المتصفح ده مش بيدعم الكاميرا. افتح الموقع من Chrome أو Safari.");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (done) return stream.getTracks().forEach(t => t.stop());
        const el = v.current!; el.srcObject = stream; await el.play(); setReady(true);
        const c = document.createElement("canvas"); const ctx = c.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (done) return;
          if (el.videoWidth) {
            const s = Math.min(1, 640 / el.videoWidth); c.width = el.videoWidth * s; c.height = el.videoHeight * s;
            ctx.drawImage(el, 0, 0, c.width, c.height);
            const img = ctx.getImageData(0, 0, c.width, c.height); const r = jsQR(img.data, img.width, img.height);
            if (r) { const t = tokenOf(r.data); if (t) { done = true; location.href = "/checkin?t=" + encodeURIComponent(t); return; } setBad(true); }
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e: any) {
        setErr(e?.name === "NotAllowedError" ? "لازم تسمح للموقع يستخدم الكاميرا. اضغط على أيقونة القفل جنب الرابط وفعّل الكاميرا، وبعدين اعمل Refresh."
          : e?.name === "NotFoundError" ? "مش لاقي كاميرا على الجهاز ده." : "مقدرناش نفتح الكاميرا. جرّب تاني.");
      }
    })();
    return () => { done = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, []);
  return (
    <main className="bg-espresso text-cream min-h-[85vh] px-6 py-10 text-center">
      <h1 className="text-3xl font-black">سجّل زيارتك</h1>
      <p className="mt-2 text-cream/70 leading-7">وجّه الكاميرا على الكود اللي عند الكاشير.</p>
      {err ? <p role="alert" className="mt-10 leading-8 text-brass">{err}</p> : (
        <div className="relative mt-8 mx-auto max-w-sm aspect-square overflow-hidden bg-black">
          <video ref={v} playsInline muted className="w-full h-full object-cover" />
          {ready && <div className="absolute inset-8 border-2 border-brass/80 pointer-events-none" />}
          {!ready && <p className="absolute inset-0 grid place-items-center text-cream/70">بنفتح الكاميرا...</p>}
        </div>)}
      {bad && !err && <p role="status" className="mt-4 text-caramel">ده مش كود الكاشير. جرّب الكود اللي على شاشته.</p>}
    </main>);
}
export default function Page() { return <Gate>{() => <Scanner />}</Gate>; }

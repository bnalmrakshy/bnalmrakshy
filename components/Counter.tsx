"use client";
import { useEffect, useState } from "react";
import { animate } from "framer-motion";
export default function Counter({ to }: { to: number }) {
  const [v, set] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1.2, ease: "easeOut", onUpdate: x => set(Math.round(x)) }); return () => c.stop(); }, [to]);
  return <span className="num">{v.toLocaleString("ar-EG")}</span>;
}

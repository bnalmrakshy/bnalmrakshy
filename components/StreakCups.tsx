"use client";
import { motion } from "framer-motion";
export default function StreakCups({ count, target, light = true }: { count: number; target: number; light?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" dir="ltr">{Array.from({ length: target }).map((_, i) => {
      const on = i < count, next = i === count;
      return (
        <motion.span key={i} className="inline-block" initial={{ scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * .06, type: "spring", stiffness: 400, damping: 18 }}>
          <svg viewBox="0 0 24 24" width={30} height={30} aria-hidden>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" fill={on ? "#B07B52" : "none"} stroke={on ? "#B07B52" : light ? "rgba(255,255,255,.3)" : "rgba(74,47,32,.3)"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            {next && <motion.path d="M8 4c0 1 1 1 1 2M12 3c0 1 1 1 1 3" stroke="#B07B52" strokeWidth="1.4" fill="none" strokeLinecap="round" animate={{ opacity: [0, 1, 0], y: [2, -2, -4] }} transition={{ duration: 1.8, repeat: Infinity }} />}
          </svg>
        </motion.span>);
    })}</div>);
}

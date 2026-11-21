"use client";
import { motion } from "framer-motion";
const steam = (d: string, delay: number) => <motion.path key={delay} d={d} stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, .6, 0], y: [6, -8, -18] }} transition={{ duration: 3.2, repeat: Infinity, delay, ease: "easeInOut" }} />;
export default function CupArt() {
  return (
    <svg viewBox="0 0 200 190" aria-hidden className="w-full h-auto">
      <ellipse cx="100" cy="170" rx="82" ry="12" fill="#000" fillOpacity=".35" /><ellipse cx="100" cy="160" rx="78" ry="12" fill="#B07B52" /><ellipse cx="100" cy="156" rx="64" ry="8" fill="#4A2F20" />
      <path d="M46 70h104v36c0 28-22 48-52 48s-52-20-52-48z" fill="#FFFFFF" /><path d="M150 82h14a16 16 0 0 1 0 32h-18" stroke="#FFFFFF" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="98" cy="70" rx="52" ry="11" fill="#4A2F20" /><ellipse cx="98" cy="70" rx="44" ry="7" fill="#B07B52" /><path d="M60 86c6 24 24 40 38 40" stroke="#E6D6C8" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".8" />
      {steam("M78 52c-8-10 8-16 0-28", 0)}{steam("M98 50c-8-10 8-16 0-30", .9)}{steam("M118 52c-8-10 8-16 0-26", 1.7)}
      <g fill="#B07B52"><ellipse cx="22" cy="152" rx="9" ry="6" transform="rotate(-25 22 152)" /><ellipse cx="180" cy="148" rx="9" ry="6" transform="rotate(20 180 148)" /></g>
    </svg>);
}

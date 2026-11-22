"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
export default function Template({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (["/office", "/admin", "/pos"].some(x => p.startsWith(x))) return <>{children}</>;
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: "easeOut" }}>{children}</motion.div>;
}

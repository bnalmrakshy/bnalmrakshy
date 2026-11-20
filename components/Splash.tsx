"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/Logo";
export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (sessionStorage.getItem("splash")) { setShow(false); return; }
    const t = setTimeout(() => { sessionStorage.setItem("splash", "1"); setShow(false); }, 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>{show && (
      <motion.div key="s" exit={{ opacity: 0 }} transition={{ duration: .4 }} className="fixed inset-0 z-[100] bg-espresso grid place-items-center">
        <div className="text-center">
          <motion.div initial={{ scale: .6, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: .7, ease: "easeOut" }} className="inline-block"><Logo size={104} /></motion.div>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4 }} className="mt-5 text-cream text-3xl font-black">المراكشي</motion.p>
          <div className="mt-8 mx-auto w-28 h-[3px] bg-cream/15 overflow-hidden rounded"><motion.div className="h-full w-full bg-brass" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} /></div>
        </div>
      </motion.div>)}</AnimatePresence>);
}

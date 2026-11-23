"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
export type Br = { id: number; name: string };
const Ctx = createContext<{ branch: string; setBranch: (b: string) => void; branches: Br[] }>({ branch: "", setBranch: () => {}, branches: [] });
export const useAdmin = () => useContext(Ctx);
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [branch, setB] = useState(""); const [branches, setBranches] = useState<Br[]>([]);
  useEffect(() => { try { setB(localStorage.getItem("adm_branch") ?? ""); } catch { /* ignore */ } sb.from("branches").select("id,name").eq("active", true).order("id").then(r => setBranches(r.data ?? [])); }, []);
  const setBranch = (b: string) => { setB(b); try { localStorage.setItem("adm_branch", b); } catch { /* ignore */ } };
  return <Ctx.Provider value={{ branch, setBranch, branches }}>{children}</Ctx.Provider>;
}

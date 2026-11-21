"use client";
import { useCallback, useEffect, useState } from "react";
export function useData(load: () => PromiseLike<{ data: any; error: any }>, init: any) {
  const [d, setD] = useState<any>(init); const [err, setErr] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => { const r = await load(); if (r.error) setErr(r.error.message); else { setErr(""); setD(r.data ?? init); } }, []);
  useEffect(() => { reload(); }, [reload]);
  return [d, reload, err] as const;
}
export const btn = "bg-espresso text-cream font-bold px-4 py-2.5 active:scale-[.98] transition disabled:opacity-40";
export const card = "rounded-2xl bg-sand/60 p-4";

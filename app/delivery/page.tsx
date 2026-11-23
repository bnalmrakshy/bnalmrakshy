"use client";
import Link from "next/link";
import Gate from "@/components/Gate";
import Orders from "@/components/admin/Orders";
export default function Page() {
  return <Gate need="staff">{() => (
    <main className="mx-auto max-w-4xl px-4 lg:px-8 pt-4 pb-8"><div className="flex items-center justify-between mb-4"><h1 className="text-xl font-black">طلبات التوصيل</h1><Link href="/pos" className="text-sm underline font-bold">شاشة الكاشير</Link></div><Orders /></main>)}</Gate>;
}

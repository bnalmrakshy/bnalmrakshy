import "./globals.css";
import { Cairo } from "next/font/google";
import Nav from "@/components/Nav";
import Motion from "@/components/Motion";
import Splash from "@/components/Splash";
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
export const metadata = { title: "المراكشي", description: "نقاطك وفواتيرك ومنيو المراكشي", appleWebApp: { capable: true, title: "المراكشي", statusBarStyle: "black-translucent" as const } };
export const viewport = { themeColor: "#141414", viewportFit: "cover" as const };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased"><Motion><Splash /><Nav />{children}</Motion></body>
    </html>
  );
}

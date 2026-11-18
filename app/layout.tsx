import "./globals.css";
import { Cairo } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
const cairo = Cairo({ subsets: ["arabic","latin"], variable: "--font-cairo", display: "swap" });
export const metadata = { title: "المراكشي ستريك", description: "كل زيارة تعلي صدارتك." };
export const viewport = { themeColor: "#2A1912", viewportFit: "cover" as const };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased"><Motion><Nav />{children}<Footer /></Motion></body>
    </html>
  );
}

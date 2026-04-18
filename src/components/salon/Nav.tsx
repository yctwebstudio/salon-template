import Link from "next/link";
import { SALON_CONFIG } from "@/config";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[#D2D2D7]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.15em] text-[#1D1D1F] hover:opacity-70 transition-opacity"
        >
          {SALON_CONFIG.name}
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] text-[#1D1D1F]/50">
          <Link href="#services" className="hover:text-[#1D1D1F] transition-colors">服務</Link>
          <Link href="#designers" className="hover:text-[#1D1D1F] transition-colors">設計師</Link>
          <Link href="#portfolio" className="hover:text-[#1D1D1F] transition-colors">作品集</Link>
        </div>

        <Link
          href="/book"
          className="text-[11px] uppercase tracking-[0.3em] bg-[#1D1D1F] text-white px-5 py-2 hover:bg-black transition-colors"
        >
          預約
        </Link>
      </div>
    </nav>
  );
}

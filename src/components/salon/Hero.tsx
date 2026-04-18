import Link from "next/link";
import { SALON_CONFIG } from "@/config";

export default function Hero() {
  const [line1, , line3] = SALON_CONFIG.tagline.split(" OF ");
  // Splits "THE ART OF HAIR CRAFT" → ["THE ART", "HAIR CRAFT"]
  const parts = SALON_CONFIG.tagline.split(" OF ");
  const top = parts[0];          // "THE ART"
  const rest = parts[1] ?? "";   // "HAIR CRAFT" → split further
  const [mid, bottom] = rest.split(" ");  // "HAIR", "CRAFT"

  return (
    <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 pt-14">
      {/* Left — text */}
      <div className="flex flex-col justify-end pb-16 pt-24 px-8 md:px-14 lg:px-20">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[#1D1D1F]/40 mb-10">
          {SALON_CONFIG.location}
        </p>

        <div className="mb-10">
          <h1 className="text-6xl md:text-7xl lg:text-8xl leading-[0.9] font-black text-[#1D1D1F]">
            {top}
          </h1>
          <h1 className="text-6xl md:text-7xl lg:text-8xl leading-[0.9] font-thin text-[#1D1D1F]">
            OF {mid}
          </h1>
          <h1 className="text-6xl md:text-7xl lg:text-8xl leading-[0.9] font-black text-[#1D1D1F]">
            {bottom}
          </h1>
        </div>

        <div className="w-12 h-px bg-[#1D1D1F]/30 mb-8" />

        <p className="text-sm text-[#1D1D1F]/50 leading-loose mb-10 max-w-xs font-light">
          {SALON_CONFIG.subTagline}
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Link
            href="/book"
            className="bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase px-8 py-4 hover:bg-black transition-colors"
          >
            預約您的專屬時段
          </Link>
          <a
            href={`tel:${SALON_CONFIG.phone.replace(/-/g, "")}`}
            className="text-[11px] text-[#1D1D1F]/40 tracking-widest self-center hover:text-[#1D1D1F] transition-colors"
          >
            {SALON_CONFIG.phone}
          </a>
        </div>

        <p className="mt-12 text-[10px] text-[#1D1D1F]/25 tracking-widest uppercase">
          Scroll to explore ↓
        </p>
      </div>

      {/* Right — editorial B&W photo */}
      {/* 替換為實際沙龍照片：將 src 改為 "/photos/hero.jpg" */}
      <div className="hidden md:block overflow-hidden bg-[#F0F0F0]">
        <img
          src="https://picsum.photos/seed/salon-hero/800/1100"
          alt={`${SALON_CONFIG.name} 沙龍空間`}
          className="w-full h-full object-cover grayscale"
        />
      </div>
    </section>
  );
}

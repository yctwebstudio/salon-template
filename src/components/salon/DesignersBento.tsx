import Link from "next/link";
import { SALON_CONFIG } from "@/config";

export default function DesignersBento() {
  const [aria, kai, zen] = SALON_CONFIG.designers;

  return (
    <section id="designers" className="py-20 px-6 md:px-12 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-[#1D1D1F]/35 mb-3">Our Team</p>
            <h2 className="text-3xl font-light text-[#1D1D1F]">設計師陣容</h2>
          </div>
          <Link
            href="/book"
            className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors border-b border-[#D2D2D7] pb-0.5"
          >
            全員預約 →
          </Link>
        </div>

        {/* Bento: 3 cols × 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:h-[560px]">
          {/* ARIA — large, row-span-2 */}
          <DesignerCard designer={aria} className="md:row-span-2 aspect-[3/4] md:aspect-auto" nameSize="xl" />

          {/* KAI — top right (col-span-2) */}
          <DesignerCard designer={kai} className="aspect-square md:aspect-auto md:col-span-2" />

          {/* Availability */}
          <div className="bg-[#F5F5F7] border border-[#D2D2D7] p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/50">今日可預約</p>
            </div>
            <div>
              <p className="text-2xl font-light text-[#1D1D1F] leading-snug">下午<br />尚有空檔</p>
              <p className="text-xs text-[#1D1D1F]/35 mt-2 tracking-wider">14:00 · 15:30 · 17:00</p>
            </div>
            <Link
              href="/book"
              className="text-[10px] uppercase tracking-widest text-[#1D1D1F] border-b border-[#1D1D1F]/20 pb-0.5 self-start hover:border-[#1D1D1F] transition-colors"
            >
              立即預約 →
            </Link>
          </div>

          {/* ZEN */}
          <DesignerCard designer={zen} className="aspect-square md:aspect-auto" />
        </div>

        <p className="text-[10px] text-[#1D1D1F]/30 mt-4 tracking-widest text-right">
          Hover to reveal · 滑鼠移入顯示彩色
        </p>
      </div>
    </section>
  );
}

// ── 設計師卡片子組件 ──────────────────────────────────────
function DesignerCard({
  designer,
  className = "",
  nameSize = "lg",
}: {
  designer: (typeof SALON_CONFIG.designers)[number];
  className?: string;
  nameSize?: "lg" | "xl";
}) {
  return (
    <div className={`overflow-hidden relative group cursor-pointer ${className}`}>
      <img
        src={designer.photo}
        alt={designer.name}
        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-0.5">
          {designer.title}
        </p>
        <h3 className={`font-bold tracking-wider ${nameSize === "xl" ? "text-2xl mb-1" : "text-xl"}`}>
          {designer.name}
        </h3>
        {nameSize === "xl" && (
          <p className="text-xs text-white/50 font-light italic">「{designer.quote}」</p>
        )}
      </div>
    </div>
  );
}

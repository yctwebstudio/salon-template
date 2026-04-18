import { SALON_CONFIG } from "@/config";

export default function Portfolio() {
  const [p1, p2, p3, p4] = SALON_CONFIG.portfolio;

  return (
    <section id="portfolio" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-[#1D1D1F]/35 mb-3">Portfolio</p>
            <h2 className="text-3xl font-light text-[#1D1D1F]">作品集</h2>
          </div>
          <p className="text-[10px] text-[#1D1D1F]/30 tracking-widest hidden md:block">
            Hover to reveal color
          </p>
        </div>

        {/* Magazine grid: 3 cols × 2 rows */}
        <div className="grid grid-cols-3 grid-rows-2 gap-2 md:gap-3 h-[300px] md:h-[560px]">
          {/* Tall portrait — col 1, row-span-2 */}
          <PortfolioImage src={p1.src} label={p1.label} className="row-span-2" />

          {/* Wide — cols 2-3, row 1 */}
          <PortfolioImage src={p2.src} label={p2.label} className="col-span-2" />

          {/* Square — row 2, col 2 */}
          <PortfolioImage src={p3.src} label={p3.label} />

          {/* Square — row 2, col 3 */}
          <PortfolioImage src={p4.src} label={p4.label} />
        </div>
      </div>
    </section>
  );
}

function PortfolioImage({
  src,
  label,
  className = "",
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden relative group cursor-pointer ${className}`}>
      <img
        src={src}
        alt={label}
        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
      <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <p className="text-white text-xs tracking-widest">{label}</p>
      </div>
    </div>
  );
}

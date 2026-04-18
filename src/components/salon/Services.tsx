import Link from "next/link";
import { SALON_CONFIG } from "@/config";

export default function Services() {
  return (
    <section id="services" className="py-20 bg-[#F5F5F7]">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#1D1D1F]/35 mb-4">Our Services</p>
          <h2 className="text-3xl font-light text-[#1D1D1F]">專業服務項目</h2>
        </div>

        {/* Service columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D2D2D7]">
          {SALON_CONFIG.services.map((s) => (
            <div key={s.id} className="p-8 bg-white">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/35 mb-3">{s.tag}</p>
              <h3 className="text-xl font-medium text-[#1D1D1F] mb-1">{s.name}</h3>
              <p className="text-xs text-[#1D1D1F]/40 mb-6 font-light">{s.desc}</p>
              <ul className="space-y-3 mb-8">
                {s.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex justify-between text-sm border-b border-[#F0F0F0] pb-3"
                  >
                    <span className="text-[#1D1D1F]/70 font-light">{item.name}</span>
                    <span className="text-[#1D1D1F] font-medium text-xs">{item.price}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/book"
                className="block text-center border border-[#1D1D1F] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase py-3 hover:bg-[#1D1D1F] hover:text-white transition-colors"
              >
                預約此項服務
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

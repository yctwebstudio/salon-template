import Link from "next/link";
import Nav from "@/components/salon/Nav";
import Hero from "@/components/salon/Hero";
import DesignersBento from "@/components/salon/DesignersBento";
import Services from "@/components/salon/Services";
import Portfolio from "@/components/salon/Portfolio";
import Footer from "@/components/salon/Footer";
import { SALON_CONFIG } from "@/config";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#1D1D1F]">
      <Nav />
      <Hero />
      <DesignersBento />
      <Services />
      <Portfolio />

      {/* Process strip */}
      <section className="py-20 bg-[#1D1D1F] text-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-white/30 mb-4">How It Works</p>
          <h2 className="text-3xl font-light mb-14">您的專屬造型之路</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6 text-left">
            {[
              {
                n: "01",
                title: "風格諮詢",
                desc: "與設計師深度溝通，了解您的生活方式、臉型與偏好，量身制定造型方向。",
              },
              {
                n: "02",
                title: "專業設計",
                desc: "由您指定的設計師親手操刀，精準剪裁每一個角度，染出屬於您的色調。",
              },
              {
                n: "03",
                title: "造型維護",
                desc: "提供專業居家護理建議，下次造訪前保持最佳狀態，並享有優先預約資格。",
              },
            ].map((step) => (
              <div key={step.n} className="border-t border-white/10 pt-8">
                <p className="text-[10px] text-white/30 tracking-[0.4em] mb-4">{step.n}</p>
                <h3 className="text-lg font-medium mb-3">{step.title}</h3>
                <p className="text-sm text-white/50 font-light leading-loose">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#1D1D1F]/35 mb-6">Book Now</p>
          <h2 className="text-4xl font-light text-[#1D1D1F] mb-4">
            預約您的<br />專屬時段
          </h2>
          <p className="text-sm text-[#1D1D1F]/40 font-light mb-10 leading-loose">
            選擇您喜愛的設計師與服務項目，<br />
            我們將為您保留最好的時光。
          </p>
          <Link
            href="/book"
            className="inline-block bg-[#1D1D1F] text-white text-[11px] tracking-[0.35em] uppercase px-12 py-4 hover:bg-black transition-colors"
          >
            立即線上預約
          </Link>
          <p className="mt-6 text-[10px] text-[#1D1D1F]/30 tracking-widest">
            或致電{" "}
            <a href={`tel:${SALON_CONFIG.phone.replace(/-/g, "")}`} className="hover:text-[#1D1D1F] transition-colors">
              {SALON_CONFIG.phone}
            </a>
            {" "}· {SALON_CONFIG.hours}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

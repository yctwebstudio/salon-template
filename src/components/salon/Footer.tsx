import { SALON_CONFIG } from "@/config";

export default function Footer() {
  return (
    <footer className="border-t border-[#D2D2D7] py-8 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-[#1D1D1F]/30">
        <span className="font-bold text-[#1D1D1F]/50">{SALON_CONFIG.name}</span>
        <span>{SALON_CONFIG.location}</span>
        <span>{SALON_CONFIG.footerNote}</span>
      </div>
    </footer>
  );
}

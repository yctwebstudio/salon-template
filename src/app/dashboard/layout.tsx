"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SALON_CONFIG } from "@/config";

const NAV = [
  { href: "/dashboard/bookings",  label: "預約管理" },
  { href: "/dashboard/designers", label: "設計師" },
  { href: "/dashboard/services",  label: "服務項目" },
  { href: "/dashboard/settings",  label: "系統設定" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { auth } = await import("@/lib/firebase");
      const { onAuthStateChanged } = await import("firebase/auth");
      const unsub = onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== process.env.NEXT_PUBLIC_STORE_OWNER_EMAIL) {
          router.replace("/login");
        } else {
          setReady(true);
        }
      });
      return () => unsub();
    })();
  }, [router]);

  async function handleSignOut() {
    const { auth } = await import("@/lib/firebase");
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <p className="text-xs text-[#1D1D1F]/30 tracking-widest uppercase">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-white border-r border-[#D2D2D7] flex flex-col">
        <div className="px-5 py-4 border-b border-[#D2D2D7]">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1D1D1F]">{SALON_CONFIG.name}</p>
          <p className="text-[9px] uppercase tracking-widest text-[#1D1D1F]/30 mt-0.5">管理後台</p>
        </div>

        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-5 py-2.5 text-xs tracking-wide transition-colors
                  ${active
                    ? "bg-[#1D1D1F] text-white"
                    : "text-[#1D1D1F]/60 hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-[#D2D2D7]">
          <button
            onClick={handleSignOut}
            className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/30 hover:text-[#1D1D1F] transition-colors"
          >
            登出
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

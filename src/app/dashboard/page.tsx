"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SALON_CONFIG } from "@/config";

type Booking = {
  id: string;
  name: string;
  phone: string;
  serviceName: string;
  serviceItem?: string;
  designerName: string;
  date: string;
  time: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: { _seconds: number } | null;
};

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending:   "待確認",
  confirmed: "已確認",
  cancelled: "已取消",
};

const STATUS_COLOR: Record<Booking["status"], string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-stone-100 text-stone-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const { auth } = await import("@/lib/firebase");
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      // 只允許 STORE_OWNER_EMAIL 進入
      if (user.email !== process.env.NEXT_PUBLIC_STORE_OWNER_EMAIL) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      await fetchBookings(user);
      });
    })();
    return () => { if (unsub) unsub(); };
  }, [router]);

  async function fetchBookings(user: { getIdToken: () => Promise<string> }) {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const { bookings: data } = await res.json();
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-[#1D1D1F]/50">
        權限不足
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Header */}
      <nav className="bg-white border-b border-[#D2D2D7] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold tracking-[0.15em]">{SALON_CONFIG.name}</span>
          <span className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/30">管理後台</span>
        </div>
        <button
          onClick={async () => {
          const { auth } = await import("@/lib/firebase");
          const { signOut } = await import("firebase/auth");
          signOut(auth).then(() => router.push("/login"));
        }}
          className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors"
        >
          登出
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* 統計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(["all", "pending", "confirmed", "cancelled"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`p-4 text-left border transition-all
                ${filter === s ? "bg-white border-[#1D1D1F]" : "bg-white border-[#D2D2D7] hover:border-[#1D1D1F]/40"}`}
            >
              <p className="text-2xl font-light text-[#1D1D1F]">{counts[s]}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mt-1">
                {s === "all" ? "全部" : STATUS_LABEL[s as Booking["status"]]}
              </p>
            </button>
          ))}
        </div>

        {/* 預約列表 */}
        {loading ? (
          <p className="text-sm text-[#1D1D1F]/40 text-center py-20">載入中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#1D1D1F]/40 text-center py-20">目前沒有預約記錄</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white border border-[#D2D2D7] p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-[#1D1D1F]">{b.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 tracking-widest ${STATUS_COLOR[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[#1D1D1F]/50">{b.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{b.date}</p>
                    <p className="text-xs text-[#1D1D1F]/50">{b.time}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-[#F5F5F7] px-2 py-1 text-[#1D1D1F]/60">
                    {b.serviceName}{b.serviceItem ? ` · ${b.serviceItem}` : ""}
                  </span>
                  <span className="bg-[#F5F5F7] px-2 py-1 text-[#1D1D1F]/60">
                    設計師：{b.designerName}
                  </span>
                  {b.notes && (
                    <span className="bg-[#F5F5F7] px-2 py-1 text-[#1D1D1F]/60">
                      備註：{b.notes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

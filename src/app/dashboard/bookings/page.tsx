"use client";

import { useEffect, useState } from "react";
import { Booking, BookingStatus, getBookings, updateBookingStatus } from "@/lib/firestore";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   "待確認",
  confirmed: "已確認",
  cancelled: "已取消",
};
const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-stone-100 text-stone-400",
};

type Filter = "all" | BookingStatus;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const { db } = await import("@/lib/firebase");
      const data = await getBookings(db);
      setBookings(data);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: BookingStatus) {
    const { db } = await import("@/lib/firebase");
    await updateBookingStatus(db, id, status);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">預約管理</h1>
        <p className="text-xs text-[#1D1D1F]/40">查看與確認所有預約申請</p>
      </div>

      {/* 統計篩選 */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {(["all", "pending", "confirmed", "cancelled"] as Filter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`p-4 text-left border transition-all bg-white
              ${filter === s ? "border-[#1D1D1F]" : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"}`}>
            <p className="text-2xl font-light text-[#1D1D1F]">{counts[s]}</p>
            <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mt-1">
              {s === "all" ? "全部" : STATUS_LABEL[s as BookingStatus]}
            </p>
          </button>
        ))}
      </div>

      {/* 預約列表 */}
      {loading ? (
        <p className="text-xs text-[#1D1D1F]/30 text-center py-20">載入中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-[#1D1D1F]/30 text-center py-20">目前沒有預約</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="bg-white border border-[#D2D2D7] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-sm text-[#1D1D1F]">{b.customer_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 tracking-widest ${STATUS_COLOR[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1D1D1F]/50">
                    <span>{b.customer_phone}</span>
                    <span>{b.designer_name}</span>
                    <span>{b.service_name}{b.service_item ? ` · ${b.service_item}` : ""}</span>
                    <span>{b.duration_min} 分鐘</span>
                  </div>
                  {b.notes && <p className="text-xs text-[#1D1D1F]/40 mt-1">備註：{b.notes}</p>}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-[#1D1D1F]">{b.date}</p>
                  <p className="text-xs text-[#1D1D1F]/50">{b.start_time} – {b.end_time}</p>

                  {/* 狀態操作 */}
                  <div className="flex gap-2 mt-3 justify-end">
                    {b.status === "pending" && (
                      <button onClick={() => changeStatus(b.id, "confirmed")}
                        className="text-[10px] px-3 py-1 bg-[#1D1D1F] text-white tracking-wide hover:bg-black transition-colors">
                        確認
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button onClick={() => changeStatus(b.id, "cancelled")}
                        className="text-[10px] px-3 py-1 border border-[#D2D2D7] text-[#1D1D1F]/50 tracking-wide hover:border-red-300 hover:text-red-400 transition-colors">
                        取消
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  getBookings, updateBooking, cancelBooking,
  type Booking, type BookingStatus,
  BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR,
} from "@/lib/firestore";

const STATUS_FILTERS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all",       label: "全部" },
  { value: "pending",   label: "待確認" },
  { value: "confirmed", label: "已確認" },
  { value: "completed", label: "已完成" },
  { value: "no_show",   label: "未到場" },
  { value: "cancelled", label: "已取消" },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [price, setPrice] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const data = await getBookings(db, {
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...(dateFilter && { date: dateFilter }),
    });
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, dateFilter]);

  const openDetail = (b: Booking) => {
    setSelected(b);
    setInternalNotes(b.internal_notes ?? "");
    setPrice(b.price > 0 ? String(b.price) : "");
    setCancelReason("");
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!selected) return;
    setSaving(true);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());

    if (newStatus === "cancelled") {
      if (!cancelReason.trim()) { alert("請填寫取消原因"); setSaving(false); return; }
      await cancelBooking(db, selected.id, cancelReason);
    } else {
      await updateBooking(db, selected.id, { status: newStatus });
    }

    const updated = { ...selected, status: newStatus };
    setSelected(updated);
    setBookings(prev => prev.map(b => b.id === selected.id ? updated : b));
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const p = price ? Number(price) : 0;
    await updateBooking(db, selected.id, { internal_notes: internalNotes, price: p });
    setSelected(s => s ? { ...s, internal_notes: internalNotes, price: p } : s);
    setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, internal_notes: internalNotes, price: p } : b));
    setSaving(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* ── 左側列表 ── */}
      <div className="w-[420px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* 篩選列 */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === f.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 text-gray-600 hover:border-gray-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs flex-1"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-xs text-gray-400 hover:text-gray-700 px-2"
              >
                清除
              </button>
            )}
            <button
              onClick={() => setDateFilter(today)}
              className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
            >
              今天
            </button>
          </div>
        </div>

        {/* 預約列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 p-4">載入中…</p>}
          {!loading && bookings.length === 0 && (
            <p className="text-xs text-gray-400 p-4">無符合預約</p>
          )}
          {bookings.map(b => (
            <button
              key={b.id}
              onClick={() => openDetail(b)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selected?.id === b.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{b.customer_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.date} {b.start_time}–{b.end_time}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{b.service_name} · {b.designer_name}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${BOOKING_STATUS_COLOR[b.status]}`}>
                  {BOOKING_STATUS_LABEL[b.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 右側詳情 ── */}
      <div className="flex-1 overflow-y-auto bg-[#F9F9F9] p-6">
        {!selected && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            從左側選擇預約以查看詳情
          </div>
        )}

        {selected && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 狀態 badge */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{selected.customer_name} 的預約</h2>
              <span className={`text-xs px-3 py-1 rounded-full ${BOOKING_STATUS_COLOR[selected.status]}`}>
                {BOOKING_STATUS_LABEL[selected.status]}
              </span>
            </div>

            {/* 基本資訊 */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {[
                ["客戶姓名", selected.customer_name],
                ["聯絡電話", selected.customer_phone],
                ["電子郵件", selected.customer_email || "—"],
                ["服務項目", selected.service_name],
                ["設計師", selected.designer_name],
                ["預約日期", selected.date],
                ["時段", `${selected.start_time} – ${selected.end_time}（${selected.duration_min} 分鐘）`],
                ["客戶備注", selected.notes || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start px-4 py-3 gap-4">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            {/* 內部備注 + 金額 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">後台備注與金額</h3>
              <div>
                <label className="text-xs text-gray-400 block mb-1">確認金額（NT$）</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-36"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">內部備注（客戶不可見）</label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="例：客戶偏好自然色系，請注意頭皮敏感"
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-full resize-none"
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="text-xs bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "儲存中…" : "儲存備注"}
              </button>
            </div>

            {/* 狀態操作 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">更新狀態</h3>
              <div className="flex flex-wrap gap-2">
                {selected.status === "pending" && (
                  <button
                    onClick={() => handleStatusChange("confirmed")}
                    disabled={saving}
                    className="text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    確認預約
                  </button>
                )}
                {(selected.status === "pending" || selected.status === "confirmed") && (
                  <>
                    <button
                      onClick={() => handleStatusChange("completed")}
                      disabled={saving}
                      className="text-xs bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      標記完成
                    </button>
                    <button
                      onClick={() => handleStatusChange("no_show")}
                      disabled={saving}
                      className="text-xs bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      未到場
                    </button>
                  </>
                )}
              </div>

              {/* 取消區塊 */}
              {selected.status !== "cancelled" && selected.status !== "completed" && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <label className="text-xs text-gray-400 block">取消原因</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="例：客戶主動取消"
                    className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                  />
                  <button
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={saving || !cancelReason.trim()}
                    className="text-xs bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    取消預約
                  </button>
                </div>
              )}

              {/* 已取消原因顯示 */}
              {selected.status === "cancelled" && selected.cancelled_reason && (
                <p className="text-xs text-red-500">取消原因：{selected.cancelled_reason}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

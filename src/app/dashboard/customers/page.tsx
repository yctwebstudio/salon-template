"use client";

import { useEffect, useState } from "react";
import { getCustomers, getCustomerBookings, type Customer, type Booking, BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/firestore";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const list = await getCustomers(db);
      setCustomers(list);
      setLoading(false);
    })();
  }, []);

  const handleSelect = async (c: Customer) => {
    setSelected(c);
    setLoadingHistory(true);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const h = await getCustomerBookings(db, c.phone);
    setHistory(h);
    setLoadingHistory(false);
  };

  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">客戶資料庫</h1>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        {/* 左側：清單 */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名或電話…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="flex-1 overflow-y-auto space-y-1">
            {loading && <p className="text-sm text-gray-400 p-4">載入中…</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-gray-400 p-4">無符合客戶</p>
            )}
            {filtered.map(c => (
              <button
                key={c.phone}
                onClick={() => handleSelect(c)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selected?.phone === c.phone
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>
                <p className={`text-xs mt-0.5 ${selected?.phone === c.phone ? "text-gray-300" : "text-gray-500"}`}>
                  共 {c.visit_count} 次預約
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 右側：客戶詳情 */}
        <div className="flex-1 overflow-y-auto">
          {!selected && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              從左側選擇客戶以查看詳情
            </div>
          )}
          {selected && (
            <div>
              {/* 基本資料 */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selected.phone}</p>
                    {selected.email && <p className="text-sm text-gray-500">{selected.email}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{selected.visit_count}</p>
                    <p className="text-xs text-gray-400">累計預約</p>
                  </div>
                </div>
                {selected.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-yellow-700 mb-1">備注</p>
                    <p className="text-sm text-yellow-800">{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* 歷史預約 */}
              <h3 className="text-sm font-semibold text-gray-700 mb-3">預約記錄</h3>
              {loadingHistory && <p className="text-sm text-gray-400">載入中…</p>}
              {!loadingHistory && history.length === 0 && (
                <p className="text-sm text-gray-400">尚無預約記錄</p>
              )}
              <div className="space-y-3">
                {history.map(b => (
                  <div key={b.id} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.date} {b.start_time}–{b.end_time}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{b.service_name} · {b.designer_name}</p>
                      {b.notes && <p className="text-xs text-gray-400 mt-0.5">「{b.notes}」</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[b.status]}`}>
                        {BOOKING_STATUS_LABEL[b.status]}
                      </span>
                      {b.price > 0 && (
                        <p className="text-xs text-gray-500 mt-1">NT$ {b.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

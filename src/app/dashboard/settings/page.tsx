"use client";

import { useEffect, useState } from "react";
import { BookingSettings, getBookingSettings, saveBookingSettings } from "@/lib/firestore";

export default function SettingsPage() {
  const [settings, setSettings] = useState<BookingSettings>({ buffer_min: 15 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase");
      const data = await getBookingSettings(db);
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const { db } = await import("@/lib/firebase");
      await saveBookingSettings(db, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "border border-[#D2D2D7] px-3 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] transition-colors w-32 text-right";

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">系統設定</h1>
        <p className="text-xs text-[#1D1D1F]/40">調整預約系統的全域參數</p>
      </div>

      {loading ? (
        <p className="text-xs text-[#1D1D1F]/30">載入中...</p>
      ) : (
        <div className="bg-white border border-[#D2D2D7] divide-y divide-[#F0F0F0]">

          {/* Buffer time */}
          <div className="px-5 py-4 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#1D1D1F] mb-1">預約緩衝時間</p>
              <p className="text-xs text-[#1D1D1F]/40 leading-relaxed">
                每個預約結束後，自動保留的休息時間（分鐘）。
                <br />用於洗工具、整理或設計師短暫休息。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={0}
                max={60}
                step={5}
                value={settings.buffer_min}
                onChange={e => setSettings(p => ({ ...p, buffer_min: Number(e.target.value) }))}
                className={inputCls}
              />
              <span className="text-xs text-[#1D1D1F]/50">分鐘</span>
            </div>
          </div>

          {/* 可預約天數範圍（未來擴充） */}
          <div className="px-5 py-4 flex items-start justify-between gap-6 opacity-40">
            <div>
              <p className="text-sm font-medium text-[#1D1D1F] mb-1">最遠可預約天數</p>
              <p className="text-xs text-[#1D1D1F]/40">
                客戶最多可提前幾天預約。（Phase 2 開放設定）
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input type="number" value={30} disabled className={`${inputCls} bg-[#F5F5F7] cursor-not-allowed`} />
              <span className="text-xs text-[#1D1D1F]/50">天</span>
            </div>
          </div>

        </div>
      )}

      {!loading && (
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase px-8 py-3 hover:bg-black transition-colors disabled:opacity-30"
          >
            {saving ? "儲存中..." : "儲存設定"}
          </button>
          {saved && <span className="text-xs text-green-600 tracking-wide">已儲存</span>}
        </div>
      )}
    </div>
  );
}

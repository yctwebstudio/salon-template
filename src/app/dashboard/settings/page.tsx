"use client";

import { useEffect, useState } from "react";
import { type BookingSettings, getBookingSettings, saveBookingSettings } from "@/lib/firestore";

const DEFAULT: BookingSettings = {
  buffer_min: 15,
  advance_booking_days: 30,
  min_advance_hours: 2,
  cancellation_hours: 24,
  slot_interval_min: 30,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const data = await getBookingSettings(db);
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      await saveBookingSettings(db, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof BookingSettings, val: number) =>
    setSettings(p => ({ ...p, [key]: val }));

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

          <SettingRow
            label="預約緩衝時間"
            desc="每個預約結束後自動保留的休息時間，用於整理工具或短暫休息。"
            unit="分鐘" min={0} max={60} step={5}
            value={settings.buffer_min}
            onChange={v => set("buffer_min", v)}
          />

          <SettingRow
            label="時段格距"
            desc="客戶選擇時間的最小間隔。例：30 分鐘表示可選 10:00、10:30、11:00..."
            unit="分鐘" min={15} max={60} step={15}
            value={settings.slot_interval_min}
            onChange={v => set("slot_interval_min", v)}
          />

          <SettingRow
            label="最遠可預約天數"
            desc="客戶最多可提前幾天預約。"
            unit="天" min={7} max={90} step={1}
            value={settings.advance_booking_days}
            onChange={v => set("advance_booking_days", v)}
          />

          <SettingRow
            label="最少提前時數"
            desc="客戶至少需提前幾小時才能預約當天時段，防止臨時搶位。"
            unit="小時" min={0} max={48} step={1}
            value={settings.min_advance_hours}
            onChange={v => set("min_advance_hours", v)}
          />

          <SettingRow
            label="取消限制時數"
            desc="預約開始前幾小時內，客戶無法自行取消（需聯繫店家）。"
            unit="小時" min={0} max={72} step={1}
            value={settings.cancellation_hours}
            onChange={v => set("cancellation_hours", v)}
          />

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
          {saved && <span className="text-xs text-green-600 tracking-wide">✓ 已儲存</span>}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label, desc, unit, min, max, step, value, onChange,
}: {
  label: string; desc: string; unit: string;
  min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="px-5 py-4 flex items-start justify-between gap-6">
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1D1D1F] mb-1">{label}</p>
        <p className="text-xs text-[#1D1D1F]/40 leading-relaxed">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="border border-[#D2D2D7] px-3 py-2 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] w-24 text-right"
        />
        <span className="text-xs text-[#1D1D1F]/50 w-8">{unit}</span>
      </div>
    </div>
  );
}

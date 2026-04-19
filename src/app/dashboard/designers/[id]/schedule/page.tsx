"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getDesigner,
  getWeeklySchedule,
  setDaySchedule,
  getExceptions,
  setException,
  deleteException,
  type Designer,
  type WeekdaySchedule,
  type ScheduleException,
  type ExceptionType,
} from "@/lib/firestore";

const DAY_NAMES = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

const DEFAULT_SCHEDULE: WeekdaySchedule = {
  day_of_week: 0,
  is_working: false,
  start_time: "10:00",
  end_time: "19:00",
  break_start: "",
  break_end: "",
};

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [schedules, setSchedules] = useState<WeekdaySchedule[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [showExForm, setShowExForm] = useState(false);
  const [exForm, setExForm] = useState<{
    date: string; type: ExceptionType; start_time: string; end_time: string; note: string;
  }>({ date: "", type: "day_off", start_time: "10:00", end_time: "19:00", note: "" });

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const [d, s, e] = await Promise.all([
        getDesigner(db, id),
        getWeeklySchedule(db, id),
        getExceptions(db, id, new Date().toISOString().slice(0, 10)),
      ]);
      setDesigner(d);
      // 補齊七天
      const map = Object.fromEntries(s.map(x => [x.day_of_week, x]));
      setSchedules(
        Array.from({ length: 7 }, (_, i) => map[i] ?? { ...DEFAULT_SCHEDULE, day_of_week: i }),
      );
      setExceptions(e);
    })();
  }, [id]);

  const handleDayToggle = (day: number) => {
    setSchedules(prev => prev.map(s => s.day_of_week === day ? { ...s, is_working: !s.is_working } : s));
  };

  const handleTimeChange = (day: number, field: keyof WeekdaySchedule, value: string) => {
    setSchedules(prev => prev.map(s => s.day_of_week === day ? { ...s, [field]: value } : s));
  };

  const saveDay = async (day: number) => {
    setSaving(day);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const s = schedules.find(x => x.day_of_week === day)!;
    await setDaySchedule(db, id, s);
    setSaving(null);
  };

  const handleAddException = async () => {
    if (!exForm.date) return;
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const ex: ScheduleException = {
      date: exForm.date,
      type: exForm.type,
      note: exForm.note,
      ...(exForm.type === "special_hours" ? { start_time: exForm.start_time, end_time: exForm.end_time } : {}),
    };
    await setException(db, id, ex);
    setExceptions(prev => {
      const filtered = prev.filter(e => e.date !== exForm.date);
      return [...filtered, ex].sort((a, b) => a.date.localeCompare(b.date));
    });
    setShowExForm(false);
    setExForm({ date: "", type: "day_off", start_time: "10:00", end_time: "19:00", note: "" });
  };

  const handleDeleteException = async (date: string) => {
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    await deleteException(db, id, date);
    setExceptions(prev => prev.filter(e => e.date !== date));
  };

  const EXCEPTION_TYPE_LABEL: Record<ExceptionType, string> = {
    day_off: "單日請假",
    vacation: "連假",
    special_hours: "特殊時段",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/designers/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
        <h1 className="text-2xl font-bold">{designer?.name} — 排班設定</h1>
      </div>

      {/* ── 週排班 ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4 text-gray-700">每週固定班表</h2>
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.day_of_week} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* 開關 */}
                <label className="flex items-center gap-2 cursor-pointer min-w-[80px]">
                  <input
                    type="checkbox"
                    checked={s.is_working}
                    onChange={() => handleDayToggle(s.day_of_week)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-sm">{DAY_NAMES[s.day_of_week]}</span>
                </label>

                {s.is_working && (
                  <>
                    {/* 上下班 */}
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={s.start_time}
                        onChange={e => handleTimeChange(s.day_of_week, "start_time", e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="time"
                        value={s.end_time}
                        onChange={e => handleTimeChange(s.day_of_week, "end_time", e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>

                    {/* 午休 */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="text-xs">午休</span>
                      <input
                        type="time"
                        value={s.break_start}
                        placeholder="--:--"
                        onChange={e => handleTimeChange(s.day_of_week, "break_start", e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-[90px]"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="time"
                        value={s.break_end}
                        placeholder="--:--"
                        onChange={e => handleTimeChange(s.day_of_week, "break_end", e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-[90px]"
                      />
                    </div>
                  </>
                )}

                {!s.is_working && (
                  <span className="text-xs text-gray-400">休假</span>
                )}

                <button
                  onClick={() => saveDay(s.day_of_week)}
                  disabled={saving === s.day_of_week}
                  className="ml-auto text-xs bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving === s.day_of_week ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 特殊例外 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">特殊例外（請假 / 特殊時間）</h2>
          <button
            onClick={() => setShowExForm(true)}
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
          >
            + 新增
          </button>
        </div>

        {exceptions.length === 0 && (
          <p className="text-sm text-gray-400">目前無特殊例外設定</p>
        )}

        <div className="space-y-2">
          {exceptions.map(ex => (
            <div key={ex.date} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm font-medium">{ex.date}</span>
                <span className="ml-3 text-xs text-gray-500">
                  {EXCEPTION_TYPE_LABEL[ex.type]}
                  {ex.type === "special_hours" && ` ${ex.start_time}–${ex.end_time}`}
                </span>
                {ex.note && <span className="ml-2 text-xs text-gray-400">（{ex.note}）</span>}
              </div>
              <button
                onClick={() => handleDeleteException(ex.date)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                刪除
              </button>
            </div>
          ))}
        </div>

        {/* 新增例外表單 */}
        {showExForm && (
          <div className="mt-4 border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
            <h3 className="text-sm font-semibold">新增特殊例外</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">日期</label>
                <input
                  type="date"
                  value={exForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setExForm(f => ({ ...f, date: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">類型</label>
                <select
                  value={exForm.type}
                  onChange={e => setExForm(f => ({ ...f, type: e.target.value as ExceptionType }))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                >
                  <option value="day_off">單日請假</option>
                  <option value="vacation">連假</option>
                  <option value="special_hours">特殊時段</option>
                </select>
              </div>
            </div>

            {exForm.type === "special_hours" && (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={exForm.start_time}
                  onChange={e => setExForm(f => ({ ...f, start_time: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="time"
                  value={exForm.end_time}
                  onChange={e => setExForm(f => ({ ...f, end_time: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 block mb-1">備注（選填）</label>
              <input
                type="text"
                value={exForm.note}
                onChange={e => setExForm(f => ({ ...f, note: e.target.value }))}
                placeholder="例：出差培訓"
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddException}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                儲存
              </button>
              <button
                onClick={() => setShowExForm(false)}
                className="text-sm border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

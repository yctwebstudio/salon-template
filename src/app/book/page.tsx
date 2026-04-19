"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SALON_CONFIG } from "@/config";
import {
  type Designer, type Service, type DesignerService, type BookingSettings,
} from "@/lib/firestore";

type Step = 1 | 2 | 3 | 4;

type BookingState = {
  serviceId: string;
  designerId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
  email: string;
};

const initState: BookingState = {
  serviceId: "", designerId: "", date: "", time: "", name: "", phone: "", notes: "", email: "",
};

const DEFAULT_SETTINGS: BookingSettings = {
  buffer_min: 15,
  advance_booking_days: 30,
  min_advance_hours: 2,
  cancellation_hours: 24,
  slot_interval_min: 30,
};

const CAT_LABEL: Record<string, string> = {
  haircut: "剪裁", color: "染燙", perm: "燙髮", treatment: "護理", other: "其他",
};

export default function BookPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<BookingState>(initState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Google 登入狀態（客戶可選）
  const [googleUser, setGoogleUser] = useState<{ email: string; displayName: string | null } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Firestore 動態資料
  const [dataLoading, setDataLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [designerServices, setDesignerServices] = useState<DesignerService[]>([]);
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS);

  // 時段
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // mount：載入設計師、服務、設定
  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { getDesigners, getServices, getBookingSettings } = await import("@/lib/firestore");
      const [allDesigners, allServices, s] = await Promise.all([
        getDesigners(db),
        getServices(db),
        getBookingSettings(db),
      ]);
      setDesigners(allDesigners.filter(d => d.active));
      setServices(allServices.filter(sv => sv.active));
      setSettings(s);
      setDataLoading(false);
    })();
  }, []);

  // 設計師改變時，載入其定價矩陣
  useEffect(() => {
    if (!form.designerId) { setDesignerServices([]); return; }
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { getDesignerServices } = await import("@/lib/firestore");
      const ds = await getDesignerServices(db, form.designerId);
      setDesignerServices(ds);
    })();
  }, [form.designerId]);

  // 取得本次服務時長
  function getDurationMin(): number {
    if (form.designerId && form.serviceId) {
      const ds = designerServices.find(d => d.id === form.serviceId);
      if (ds) return ds.duration_min;
    }
    const svc = services.find(s => s.id === form.serviceId);
    return svc?.base_duration_min ?? 60;
  }

  // 計算最遠可選日期
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + settings.advance_booking_days);
    return d.toISOString().split("T")[0];
  })();

  // 動態計算時段
  const computeSlots = useCallback(async (designerId: string, date: string) => {
    if (!date) { setAvailableSlots([]); return; }
    setSlotsLoading(true);
    try {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const {
        getWeeklySchedule, getExceptions, getBookings,
        calcAvailableSlots, timeToMin, minToTime,
      } = await import("@/lib/firestore");

      const durationMin = getDurationMin();
      let slots: string[];

      if (designerId) {
        // 依設計師排班計算
        const dayOfWeek = new Date(date + "T12:00:00").getDay();
        const [weeklySchedule, exceptions, existingBookings] = await Promise.all([
          getWeeklySchedule(db, designerId),
          getExceptions(db, designerId, date),
          getBookings(db, { designerId, date }),
        ]);
        const schedule = weeklySchedule.find(s => s.day_of_week === dayOfWeek) ?? null;
        const exception = exceptions.find(e => e.date === date) ?? null;
        slots = calcAvailableSlots({
          schedule,
          exception,
          existingBookings: existingBookings.filter(b => b.status !== "cancelled"),
          durationMin,
          bufferMin: settings.buffer_min,
          slotIntervalMin: settings.slot_interval_min,
        });
      } else {
        // 不指定設計師：通用時段 10:00–20:00
        slots = [];
        let cursor = 10 * 60;
        while (cursor + durationMin <= 20 * 60) {
          slots.push(minToTime(cursor));
          cursor += settings.slot_interval_min;
        }
      }

      // 當天過濾：需提前 min_advance_hours
      const todayStr = new Date().toISOString().split("T")[0];
      if (date === todayStr) {
        const now = new Date();
        const minStartMin = now.getHours() * 60 + now.getMinutes() + settings.min_advance_hours * 60;
        slots = slots.filter(s => timeToMin(s) >= minStartMin);
      }

      setAvailableSlots(slots);
      setForm(prev => slots.includes(prev.time) ? prev : { ...prev, time: "" });
    } finally {
      setSlotsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, designerServices]);

  useEffect(() => {
    computeSlots(form.designerId, form.date);
  }, [form.designerId, form.date, computeSlots]);

  function set<K extends keyof BookingState>(key: K, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const selectedService = services.find(s => s.id === form.serviceId);
  const selectedDesigner = designers.find(d => d.id === form.designerId);

  // 取得顯示價格（設計師定價優先，否則公版）
  function getPriceLabel(service: Service): string | null {
    if (form.designerId) {
      const ds = designerServices.find(d => d.id === service.id);
      if (ds && ds.price_min > 0) {
        return ds.price_max > ds.price_min
          ? `NT$ ${ds.price_min.toLocaleString()} – ${ds.price_max.toLocaleString()}`
          : `NT$ ${ds.price_min.toLocaleString()}`;
      }
    }
    if (service.base_price_min > 0) {
      return service.base_price_max > service.base_price_min
        ? `NT$ ${service.base_price_min.toLocaleString()} – ${service.base_price_max.toLocaleString()} 起`
        : `NT$ ${service.base_price_min.toLocaleString()} 起`;
    }
    return null;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { signInAnonymously } = await import("firebase/auth");
      const userCred = await signInAnonymously(auth);
      const token = await userCred.user.getIdToken();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id:     form.serviceId,
          service_name:   selectedService?.name ?? "",
          designer_id:    form.designerId,
          designer_name:  selectedDesigner?.name ?? "不指定",
          date:           form.date,
          start_time:     form.time,
          duration_min:   getDurationMin(),
          customer_name:  form.name,
          customer_phone: form.phone,
          customer_email: form.email,
          notes:          form.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "送出失敗");
      }
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "系統錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ["服務選擇", "時段安排", "聯絡資訊", "確認完成"];

  return (
    <main className="min-h-screen bg-white text-[#1D1D1F]">
      {/* Nav */}
      <nav className="border-b border-[#D2D2D7] px-6 h-14 flex items-center justify-between">
        <Link href="/"
          className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors">
          ← 返回
        </Link>
        <span className="text-sm font-bold tracking-[0.15em] text-[#1D1D1F]">{SALON_CONFIG.name}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/30">線上預約</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center gap-0 mb-12">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors
                  ${step > i + 1 ? "bg-[#1D1D1F] text-white" : step === i + 1 ? "border border-[#1D1D1F] text-[#1D1D1F]" : "border border-[#D2D2D7] text-[#D2D2D7]"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <p className={`text-[9px] tracking-wider mt-1 hidden sm:block ${step === i + 1 ? "text-[#1D1D1F]" : "text-[#1D1D1F]/30"}`}>
                  {label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 transition-colors ${step > i + 1 ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: 服務 ── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-light mb-2">選擇服務項目</h1>
            <p className="text-sm text-[#1D1D1F]/40 mb-8 font-light">請先選擇您想要的服務類別。</p>

            {dataLoading ? (
              <p className="text-xs text-[#1D1D1F]/30 py-8 text-center">載入中...</p>
            ) : services.length === 0 ? (
              <p className="text-xs text-[#1D1D1F]/30 py-8 text-center">目前尚無可預約的服務項目</p>
            ) : (
              <div className="space-y-3 mb-8">
                {services.map(s => (
                  <button key={s.id} onClick={() => set("serviceId", s.id)}
                    className={`w-full text-left border p-5 transition-all
                      ${form.serviceId === s.id ? "border-[#1D1D1F] bg-[#F5F5F7]" : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/35 mb-1">
                          {CAT_LABEL[s.category]}
                        </p>
                        <p className="font-medium text-[#1D1D1F]">{s.name}</p>
                        {s.description && <p className="text-xs text-[#1D1D1F]/40 mt-0.5">{s.description}</p>}
                        {s.base_price_min > 0 && (
                          <p className="text-xs text-[#1D1D1F]/40 mt-1">
                            NT$ {s.base_price_min.toLocaleString()}
                            {s.base_price_max > s.base_price_min ? ` – ${s.base_price_max.toLocaleString()}` : ""} 起
                          </p>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded-full border mt-1 transition-all shrink-0
                        ${form.serviceId === s.id ? "border-[#1D1D1F] bg-[#1D1D1F]" : "border-[#D2D2D7]"}`} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button disabled={!form.serviceId || dataLoading} onClick={() => setStep(2)}
              className="w-full bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              下一步 →
            </button>
          </div>
        )}

        {/* ── Step 2: 設計師 + 時段 ── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-light mb-2">選擇設計師與時段</h1>
            <p className="text-sm text-[#1D1D1F]/40 mb-8 font-light">依偏好選擇設計師，再選擇您方便的日期與時間。</p>

            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">設計師</p>
              <div className="grid grid-cols-3 gap-3">
                {designers.map(d => (
                  <button key={d.id} onClick={() => set("designerId", d.id)}
                    className={`border p-3 text-center transition-all
                      ${form.designerId === d.id ? "border-[#1D1D1F]" : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"}`}>
                    <div className="w-12 h-12 mx-auto mb-2 overflow-hidden grayscale bg-[#F5F5F7]">
                      {d.photo_url ? (
                        <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1D1D1F]/20 text-lg">
                          {d.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold">{d.name}</p>
                    <p className="text-[10px] text-[#1D1D1F]/40">{d.title}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => set("designerId", "")}
                className={`mt-2 text-[10px] text-[#1D1D1F]/40 underline-offset-2 hover:underline ${form.designerId === "" ? "underline" : ""}`}>
                不指定設計師
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">日期</p>
              <input type="date" value={form.date}
                min={new Date().toISOString().split("T")[0]}
                max={maxDate}
                onChange={e => set("date", e.target.value)}
                className="w-full border border-[#D2D2D7] px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] transition-colors" />
            </div>

            <div className="mb-10">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">時段</p>
              {!form.date ? (
                <p className="text-xs text-[#1D1D1F]/30">請先選擇日期</p>
              ) : slotsLoading ? (
                <p className="text-xs text-[#1D1D1F]/30">計算可用時段中...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-[#1D1D1F]/40">此日期無可用時段，請選擇其他日期</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map(t => (
                    <button key={t} onClick={() => set("time", t)}
                      className={`border py-2.5 text-xs tracking-wider transition-all
                        ${form.time === t ? "border-[#1D1D1F] bg-[#1D1D1F] text-white" : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:border-[#1D1D1F] transition-colors">
                上一步
              </button>
              <button disabled={!form.date || !form.time} onClick={() => setStep(3)}
                className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 聯絡資訊 ── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-light mb-2">留下聯絡資訊</h1>
            <p className="text-sm text-[#1D1D1F]/40 mb-8 font-light">確認預約前，請填寫基本聯絡方式。</p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">姓名 *</label>
                <input type="text" placeholder="您的姓名" value={form.name}
                  onChange={e => set("name", e.target.value)}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors placeholder:text-[#1D1D1F]/25" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">手機 / LINE ID *</label>
                <input type="tel" placeholder="09XX-XXX-XXX 或 LINE ID" value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors placeholder:text-[#1D1D1F]/25" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widests text-[#1D1D1F]/40 mb-2">特殊需求（選填）</label>
                <textarea placeholder="例：頭髮受損嚴重、第一次染髮、對某些成分過敏..." value={form.notes}
                  onChange={e => set("notes", e.target.value)} rows={3}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors resize-none placeholder:text-[#1D1D1F]/25" />
              </div>
            </div>

            {/* Google 登入（可選）— 用於日後查看預約 */}
            <div className="border border-dashed border-[#D2D2D7] p-4 mb-2">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">查看預約記錄（選填）</p>
              {googleUser ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#1D1D1F]">{googleUser.displayName ?? googleUser.email}</p>
                    <p className="text-[10px] text-[#1D1D1F]/40">{googleUser.email}</p>
                  </div>
                  <button onClick={async () => {
                    const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
                    const { signOut } = await import("firebase/auth");
                    await signOut(auth);
                    setGoogleUser(null);
                    set("email", "");
                  }} className="text-[10px] text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors">
                    切換帳號
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[#1D1D1F]/50 mb-3">使用 Google 登入，方便日後在「我的預約」查看狀態。</p>
                  <button onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
                      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
                      const result = await signInWithPopup(auth, new GoogleAuthProvider());
                      setGoogleUser({ email: result.user.email!, displayName: result.user.displayName });
                      set("email", result.user.email!);
                    } catch { /* 使用者取消 */ } finally {
                      setGoogleLoading(false);
                    }
                  }} disabled={googleLoading}
                    className="flex items-center gap-2 border border-[#D2D2D7] px-4 py-2 text-xs text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors disabled:opacity-50">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? "登入中..." : "使用 Google 登入"}
                  </button>
                </div>
              )}
            </div>

            {/* 摘要 */}
            <div className="bg-[#F5F5F7] border border-[#D2D2D7] p-5 mb-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">預約摘要</p>
              <Row label="服務">{selectedService?.name ?? "—"}</Row>
              <Row label="設計師">{selectedDesigner?.name ?? "不指定"}</Row>
              <Row label="日期">{form.date}</Row>
              <Row label="時間">{form.time}</Row>
              {selectedService && getPriceLabel(selectedService) && (
                <Row label="參考價格">{getPriceLabel(selectedService)!}</Row>
              )}
            </div>

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:border-[#1D1D1F] transition-colors">
                上一步
              </button>
              <button disabled={!form.name || !form.phone || submitting} onClick={handleSubmit}
                className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? "送出中..." : "確認送出"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 完成 ── */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border border-[#D2D2D7] rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-2xl text-[#1D1D1F]">✓</span>
            </div>
            <h1 className="text-2xl font-light mb-3">預約申請已收到</h1>
            <p className="text-sm text-[#1D1D1F]/40 font-light leading-loose mb-10">
              我們將在 1–2 小時內以 LINE 或電話與您確認。
              <br />
              如未收到回覆，請致電{" "}
              <a href={`tel:${SALON_CONFIG.phone.replace(/-/g, "")}`} className="underline">
                {SALON_CONFIG.phone}
              </a>。
            </p>

            <div className="bg-[#F5F5F7] border border-[#D2D2D7] p-6 text-left mb-10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">您的預約內容</p>
              <Row label="姓名">{form.name}</Row>
              <Row label="服務">{selectedService?.name ?? "—"}</Row>
              <Row label="設計師">{selectedDesigner?.name ?? "不指定"}</Row>
              <Row label="時間">{form.date} {form.time}</Row>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {googleUser && (
                <Link href="/my-bookings"
                  className="inline-block bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase px-10 py-3 hover:bg-black transition-colors">
                  查看我的預約
                </Link>
              )}
              <Link href="/"
                className="inline-block border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-10 py-3 hover:border-[#1D1D1F] transition-colors">
                返回首頁
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#1D1D1F]/50 font-light">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

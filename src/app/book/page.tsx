"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SALON_CONFIG, TIME_SLOTS } from "@/config";
import { Designer, Service, DesignerService } from "@/lib/firestore";

type Step = 1 | 2 | 3 | 4;

type BookingState = {
  serviceId: string;
  designerId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
};

const initState: BookingState = {
  serviceId: "",
  designerId: "",
  date: "",
  time: "",
  name: "",
  phone: "",
  notes: "",
};

export default function BookPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<BookingState>(initState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Firestore 動態資料
  const [dataLoading, setDataLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  // 選定設計師後，其服務定價矩陣
  const [designerServices, setDesignerServices] = useState<DesignerService[]>([]);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase");
      const { getDesigners, getServices } = await import("@/lib/firestore");
      const [allDesigners, allServices] = await Promise.all([
        getDesigners(db),
        getServices(db),
      ]);
      setDesigners(allDesigners.filter(d => d.active));
      setServices(allServices.filter(s => s.active));
      setDataLoading(false);
    })();
  }, []);

  // 當設計師改變時，載入其定價矩陣（取得 duration_min）
  useEffect(() => {
    if (!form.designerId) {
      setDesignerServices([]);
      return;
    }
    (async () => {
      const { db } = await import("@/lib/firebase");
      const { getDesignerServices } = await import("@/lib/firestore");
      const ds = await getDesignerServices(db, form.designerId);
      setDesignerServices(ds);
    })();
  }, [form.designerId]);

  function set<K extends keyof BookingState>(key: K, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const selectedService = services.find(s => s.id === form.serviceId);
  const selectedDesigner = designers.find(d => d.id === form.designerId);

  // 取得本次服務的時長：優先用定價矩陣，否則 fallback 60 分鐘
  function getDurationMin(): number {
    if (form.designerId && form.serviceId) {
      const ds = designerServices.find(d => d.id === form.serviceId);
      if (ds) return ds.duration_min;
    }
    return 60;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const { auth } = await import("@/lib/firebase");
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
          service_item:   "",
          designer_id:    form.designerId,
          designer_name:  selectedDesigner?.name ?? "不指定",
          date:           form.date,
          start_time:     form.time,
          duration_min:   getDurationMin(),
          customer_name:  form.name,
          customer_phone: form.phone,
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
        <Link
          href="/"
          className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors"
        >
          ← 返回
        </Link>
        <span className="text-sm font-bold tracking-[0.15em] text-[#1D1D1F]">
          {SALON_CONFIG.name}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/30">線上預約</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center gap-0 mb-12">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors
                    ${step > i + 1
                      ? "bg-[#1D1D1F] text-white"
                      : step === i + 1
                      ? "border border-[#1D1D1F] text-[#1D1D1F]"
                      : "border border-[#D2D2D7] text-[#D2D2D7]"
                    }`}
                >
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <p
                  className={`text-[9px] tracking-wider mt-1 hidden sm:block
                    ${step === i + 1 ? "text-[#1D1D1F]" : "text-[#1D1D1F]/30"}`}
                >
                  {label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 transition-colors ${
                    step > i + 1 ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"
                  }`}
                />
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
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => set("serviceId", s.id)}
                    className={`w-full text-left border p-5 transition-all
                      ${form.serviceId === s.id
                        ? "border-[#1D1D1F] bg-[#F5F5F7]"
                        : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/35 mb-1">
                          {CAT_LABEL[s.category]}
                        </p>
                        <p className="font-medium text-[#1D1D1F]">{s.name}</p>
                        {s.description && (
                          <p className="text-xs text-[#1D1D1F]/40 mt-0.5">{s.description}</p>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border mt-1 transition-all shrink-0
                          ${form.serviceId === s.id
                            ? "border-[#1D1D1F] bg-[#1D1D1F]"
                            : "border-[#D2D2D7]"
                          }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              disabled={!form.serviceId || dataLoading}
              onClick={() => setStep(2)}
              className="w-full bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              下一步 →
            </button>
          </div>
        )}

        {/* ── Step 2: 設計師 + 時段 ── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-light mb-2">選擇設計師與時段</h1>
            <p className="text-sm text-[#1D1D1F]/40 mb-8 font-light">
              依偏好選擇設計師，再選擇您方便的日期與時間。
            </p>

            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">設計師</p>
              <div className="grid grid-cols-3 gap-3">
                {designers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => set("designerId", d.id)}
                    className={`border p-3 text-center transition-all
                      ${form.designerId === d.id
                        ? "border-[#1D1D1F]"
                        : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"
                      }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-2 overflow-hidden grayscale bg-[#F5F5F7]">
                      {d.photo_url ? (
                        <img
                          src={d.photo_url}
                          alt={d.name}
                          className="w-full h-full object-cover"
                        />
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
              <button
                onClick={() => set("designerId", "")}
                className={`mt-2 text-[10px] text-[#1D1D1F]/40 underline-offset-2 hover:underline ${form.designerId === "" ? "underline" : ""}`}
              >
                不指定設計師
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">日期</p>
              <input
                type="date"
                value={form.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("date", e.target.value)}
                className="w-full border border-[#D2D2D7] px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] transition-colors"
              />
            </div>

            <div className="mb-10">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">時段</p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => set("time", t)}
                    className={`border py-2.5 text-xs tracking-wider transition-all
                      ${form.time === t
                        ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                        : "border-[#D2D2D7] hover:border-[#1D1D1F]/40"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:border-[#1D1D1F] transition-colors"
              >
                上一步
              </button>
              <button
                disabled={!form.date || !form.time}
                onClick={() => setStep(3)}
                className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 聯絡資訊 ── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-light mb-2">留下聯絡資訊</h1>
            <p className="text-sm text-[#1D1D1F]/40 mb-8 font-light">
              確認預約前，請填寫基本聯絡方式。
            </p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  placeholder="您的姓名"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors placeholder:text-[#1D1D1F]/25"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">
                  手機 / LINE ID *
                </label>
                <input
                  type="tel"
                  placeholder="09XX-XXX-XXX 或 LINE ID"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors placeholder:text-[#1D1D1F]/25"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">
                  特殊需求（選填）
                </label>
                <textarea
                  placeholder="例：頭髮受損嚴重、第一次染髮、對某些成分過敏..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors resize-none placeholder:text-[#1D1D1F]/25"
                />
              </div>
            </div>

            {/* 摘要 */}
            <div className="bg-[#F5F5F7] border border-[#D2D2D7] p-5 mb-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">預約摘要</p>
              <Row label="服務">{selectedService?.name ?? "—"}</Row>
              <Row label="設計師">{selectedDesigner?.name ?? "不指定"}</Row>
              <Row label="日期">{form.date}</Row>
              <Row label="時間">{form.time}</Row>
            </div>

            {error && (
              <p className="text-red-500 text-xs mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:border-[#1D1D1F] transition-colors"
              >
                上一步
              </button>
              <button
                disabled={!form.name || !form.phone || submitting}
                onClick={handleSubmit}
                className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
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
              </a>
              。
            </p>

            <div className="bg-[#F5F5F7] border border-[#D2D2D7] p-6 text-left mb-10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">您的預約內容</p>
              <Row label="姓名">{form.name}</Row>
              <Row label="服務">{selectedService?.name ?? "—"}</Row>
              <Row label="設計師">{selectedDesigner?.name ?? "不指定"}</Row>
              <Row label="時間">{form.date} {form.time}</Row>
            </div>

            <Link
              href="/"
              className="inline-block border border-[#D2D2D7] text-[#1D1D1F] text-[11px] tracking-[0.3em] uppercase px-10 py-3 hover:border-[#1D1D1F] transition-colors"
            >
              返回首頁
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

const CAT_LABEL: Record<string, string> = {
  haircut:   "剪裁",
  color:     "染燙",
  treatment: "護理",
  other:     "其他",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#1D1D1F]/50 font-light">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

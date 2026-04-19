"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Designer, saveDesigner } from "@/lib/firestore";

type FormState = Omit<Designer, "id" | "created_at">;

const EMPTY: FormState = {
  name: "",
  title: "",
  bio: "",
  photo_url: "",
  level: "junior",
  specialties: [],
  instagram: "",
  line_id: "",
  active: true,
  join_date: new Date().toISOString().slice(0, 10),
};

const SPECIALTY_OPTIONS = ["剪髮", "染髮", "燙髮", "護髮", "頭皮護理", "造型設計", "新娘造型"];

export default function DesignerForm({ initial }: { initial?: Designer }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          title: initial.title,
          bio: initial.bio,
          photo_url: initial.photo_url,
          level: initial.level,
          specialties: initial.specialties ?? [],
          instagram: initial.instagram ?? "",
          line_id: initial.line_id ?? "",
          active: initial.active,
          join_date: initial.join_date ?? "",
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleSpecialty(s: string) {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("請填寫設計師姓名"); return; }
    setSaving(true);
    setError("");
    try {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      await saveDesigner(db, form, initial?.id);
      router.push("/dashboard/designers");
    } catch {
      setError("儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-xl font-medium text-[#1D1D1F]">
          {isEdit ? `編輯設計師 — ${initial?.name}` : "新增設計師"}
        </h1>
        {isEdit && (
          <div className="ml-auto flex gap-2">
            <Link
              href={`/dashboard/designers/${initial?.id}/services`}
              className="text-xs border border-[#D2D2D7] px-4 py-2 hover:bg-gray-50"
            >
              定價矩陣
            </Link>
            <Link
              href={`/dashboard/designers/${initial?.id}/schedule`}
              className="text-xs border border-[#D2D2D7] px-4 py-2 hover:bg-gray-50"
            >
              排班設定
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="姓名 *">
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="例：ARIA" className={inputCls} />
          </Field>
          <Field label="職稱">
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="例：首席造型師" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="等級">
            <select value={form.level} onChange={e => set("level", e.target.value as Designer["level"])}
              className={inputCls}>
              <option value="junior">造型師（Junior）</option>
              <option value="senior">資深造型師（Senior）</option>
              <option value="principal">首席（Principal）</option>
            </select>
          </Field>
          <Field label="入職日期">
            <input type="date" value={form.join_date} onChange={e => set("join_date", e.target.value)}
              className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => set("instagram", e.target.value)}
              placeholder="@handle" className={inputCls} />
          </Field>
          <Field label="Line ID">
            <input value={form.line_id} onChange={e => set("line_id", e.target.value)}
              placeholder="line_id" className={inputCls} />
          </Field>
        </div>

        <Field label="照片網址">
          <input value={form.photo_url} onChange={e => set("photo_url", e.target.value)}
            placeholder="/photos/aria.jpg 或 https://..." className={inputCls} />
          {form.photo_url && (
            <div className="mt-2 w-16 h-16 overflow-hidden border border-[#D2D2D7]">
              <img src={form.photo_url} alt="preview" className="w-full h-full object-cover grayscale"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </Field>

        <Field label="個人簡介">
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
            placeholder="簡短介紹設計師的專長與風格..." rows={3} className={`${inputCls} resize-none`} />
        </Field>

        <Field label="專長標籤">
          <div className="flex flex-wrap gap-2 mt-1">
            {SPECIALTY_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`text-xs px-3 py-1.5 border rounded-full transition-colors ${
                  form.specialties.includes(s)
                    ? "bg-[#1D1D1F] text-white border-[#1D1D1F]"
                    : "border-[#D2D2D7] text-[#1D1D1F]/60 hover:border-[#1D1D1F]/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => set("active", !form.active)}
            className={`w-10 h-5 rounded-full relative transition-colors ${form.active ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "left-5" : "left-0.5"}`} />
          </button>
          <span className="text-sm text-[#1D1D1F]">{form.active ? "啟用中" : "已停用"}</span>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()}
            className="border border-[#D2D2D7] text-[#1D1D1F]/60 text-[11px] tracking-[0.3em] uppercase px-6 py-3 hover:border-[#1D1D1F]/40 transition-colors">
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-3 hover:bg-black transition-colors disabled:opacity-30">
            {saving ? "儲存中..." : isEdit ? "儲存變更" : "新增設計師"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-[#D2D2D7] px-3 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">{label}</label>
      {children}
    </div>
  );
}

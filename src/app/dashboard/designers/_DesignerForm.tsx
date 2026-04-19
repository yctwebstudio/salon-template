"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Designer, saveDesigner } from "@/lib/firestore";

type FormState = Omit<Designer, "id" | "created_at">;

const EMPTY: FormState = {
  name: "",
  title: "",
  bio: "",
  photo_url: "",
  level: "junior",
  active: true,
};

export default function DesignerForm({ initial }: { initial?: Designer }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    initial ? { name: initial.name, title: initial.title, bio: initial.bio,
                 photo_url: initial.photo_url, level: initial.level, active: initial.active }
             : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("請填寫設計師姓名"); return; }
    setSaving(true);
    setError("");
    try {
      const { db } = await import("@/lib/firebase");
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
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">
          {isEdit ? "編輯設計師" : "新增設計師"}
        </h1>
        <p className="text-xs text-[#1D1D1F]/40">填寫基本資料，定價請至「定價矩陣」設定</p>
      </div>

      <div className="space-y-5">
        {/* 姓名 */}
        <Field label="姓名 *">
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="例：ARIA" className={inputCls} />
        </Field>

        {/* 職稱 */}
        <Field label="職稱顯示">
          <input value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="例：首席造型師" className={inputCls} />
        </Field>

        {/* 等級 */}
        <Field label="等級">
          <select value={form.level} onChange={e => set("level", e.target.value as Designer["level"])}
            className={inputCls}>
            <option value="junior">造型師（Junior）</option>
            <option value="senior">資深造型師（Senior）</option>
            <option value="director">院長（Director）</option>
          </select>
        </Field>

        {/* 照片網址 */}
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

        {/* 個人簡介 */}
        <Field label="個人簡介">
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
            placeholder="簡短介紹設計師的專長與風格..." rows={3} className={`${inputCls} resize-none`} />
        </Field>

        {/* 啟用狀態 */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => set("active", !form.active)}
            className={`w-10 h-5 rounded-full relative transition-colors
              ${form.active ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${form.active ? "left-5" : "left-0.5"}`} />
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

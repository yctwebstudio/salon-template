"use client";

import { useEffect, useState } from "react";
import { type Service, getServices, saveService } from "@/lib/firestore";

type FormState = Omit<Service, "id">;

const EMPTY: FormState = {
  name: "",
  category: "haircut",
  description: "",
  base_duration_min: 60,
  base_price_min: 0,
  base_price_max: 0,
  sort_order: 0,
  active: true,
};

const CAT_OPTIONS: { value: Service["category"]; label: string }[] = [
  { value: "haircut",   label: "剪裁（Haircut）" },
  { value: "color",     label: "染色（Color）" },
  { value: "perm",      label: "燙髮（Perm）" },
  { value: "treatment", label: "護理（Treatment）" },
  { value: "other",     label: "其他" },
];

const CAT_LABEL: Record<Service["category"], string> = {
  haircut: "剪裁", color: "染色", perm: "燙髮", treatment: "護理", other: "其他",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const data = await getServices(db);
    setServices(data);
    setLoading(false);
  }

  function startNew() {
    setEditId(null);
    const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) + 1 : 0;
    setForm({ ...EMPTY, sort_order: maxOrder });
    setShowForm(true);
  }

  function startEdit(s: Service) {
    setEditId(s.id);
    setForm({
      name: s.name,
      category: s.category,
      description: s.description,
      base_duration_min: s.base_duration_min,
      base_price_min: s.base_price_min ?? 0,
      base_price_max: s.base_price_max ?? 0,
      sort_order: s.sort_order,
      active: s.active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const id = await saveService(db, form, editId ?? undefined);
      if (editId) {
        setServices(prev => prev.map(s => s.id === editId ? { id, ...form } : s));
      } else {
        setServices(prev => [...prev, { id, ...form }]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Service) {
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    await saveService(db, { ...s, active: !s.active }, s.id);
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
  }

  const inputCls = "w-full border border-[#D2D2D7] px-3 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#1D1D1F] transition-colors";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">服務項目管理</h1>
          <p className="text-xs text-[#1D1D1F]/40">管理沙龍提供的服務分類，各設計師定價請至「定價矩陣」設定</p>
        </div>
        <button onClick={startNew}
          className="bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 hover:bg-black transition-colors">
          + 新增服務
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#1D1D1F] p-6 mb-6 max-w-lg">
          <h2 className="text-sm font-medium text-[#1D1D1F] mb-5">
            {editId ? "編輯服務" : "新增服務"}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">服務名稱 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="例：洗剪吹" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">分類</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as Service["category"] }))}
                  className={inputCls}>
                  {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">基礎時長（分鐘）</label>
                <input type="number" value={form.base_duration_min} min={15} step={15}
                  onChange={e => setForm(p => ({ ...p, base_duration_min: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">排序</label>
                <input type="number" value={form.sort_order} min={0}
                  onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">公版最低價（NT$）</label>
                <input type="number" value={form.base_price_min} min={0}
                  placeholder="不指定設計師時顯示"
                  onChange={e => setForm(p => ({ ...p, base_price_min: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">公版最高價（NT$）</label>
                <input type="number" value={form.base_price_max} min={0}
                  placeholder="0 = 同上"
                  onChange={e => setForm(p => ({ ...p, base_price_max: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">說明（選填）</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="簡短描述此服務" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowForm(false)}
              className="border border-[#D2D2D7] text-[#1D1D1F]/50 text-[11px] tracking-widest uppercase px-5 py-2.5 hover:border-[#1D1D1F]/40 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="flex-1 bg-[#1D1D1F] text-white text-[11px] tracking-widest uppercase py-2.5 hover:bg-black transition-colors disabled:opacity-30">
              {saving ? "儲存中..." : editId ? "儲存" : "新增"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[#1D1D1F]/30 text-center py-20">載入中...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#D2D2D7]">
          <p className="text-sm text-[#1D1D1F]/40">尚未新增服務項目</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className="bg-white border border-[#D2D2D7] px-4 py-3 flex items-center gap-4">
              <span className="text-[10px] bg-[#F5F5F7] text-[#1D1D1F]/50 px-2 py-1 tracking-wider shrink-0">
                {CAT_LABEL[s.category]}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#1D1D1F]">{s.name}</span>
                <span className="ml-2 text-xs text-[#1D1D1F]/30">{s.base_duration_min} 分鐘</span>
                {s.base_price_min > 0 && (
                  <span className="ml-2 text-xs text-[#1D1D1F]/40">
                    NT$ {s.base_price_min.toLocaleString()}{s.base_price_max > s.base_price_min ? `–${s.base_price_max.toLocaleString()}` : ""}
                  </span>
                )}
                {s.description && <p className="text-xs text-[#1D1D1F]/40 mt-0.5 truncate">{s.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(s)}
                  className={`text-[10px] px-3 py-1 border tracking-wide transition-colors ${
                    s.active
                      ? "border-green-200 text-green-600 hover:border-red-200 hover:text-red-400"
                      : "border-[#D2D2D7] text-[#1D1D1F]/30 hover:border-green-200 hover:text-green-500"
                  }`}>
                  {s.active ? "啟用" : "停用"}
                </button>
                <button onClick={() => startEdit(s)}
                  className="text-[10px] px-3 py-1 border border-[#D2D2D7] text-[#1D1D1F]/50 hover:border-[#1D1D1F]/40 transition-colors">
                  編輯
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

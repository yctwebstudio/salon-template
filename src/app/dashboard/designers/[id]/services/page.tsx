"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  type Designer, type Service, type DesignerService,
  getDesigner, getServices, getDesignerServices,
  setDesignerService, deleteDesignerService,
} from "@/lib/firestore";

type Row = {
  service: Service;
  ds: DesignerService | null;
  editing: boolean;
  price_min: string;
  price_max: string;
  duration: string;
  active: boolean;
};

const CATEGORY_LABEL: Record<string, string> = {
  haircut:   "剪裁",
  color:     "染色",
  perm:      "燙髮",
  treatment: "護理",
  other:     "其他",
};

export default function DesignerServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: designerId } = use(params);
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const [des, services, dsRaw] = await Promise.all([
        getDesigner(db, designerId),
        getServices(db),
        getDesignerServices(db, designerId),
      ]);
      setDesigner(des);
      const dsMap = Object.fromEntries(dsRaw.map(d => [d.id, d]));
      setRows(services.filter(s => s.active).map(s => {
        const ds = dsMap[s.id] ?? null;
        return {
          service: s,
          ds,
          editing: false,
          price_min: ds ? String(ds.price_min) : "",
          price_max: ds ? String(ds.price_max) : "",
          duration:  ds ? String(ds.duration_min) : String(s.base_duration_min || ""),
          active:    ds ? ds.active : true,
        };
      }));
      setLoading(false);
    })();
  }, [designerId]);

  const startEdit = (sid: string) =>
    setRows(p => p.map(r => r.service.id === sid ? { ...r, editing: true } : r));

  const cancelEdit = (sid: string) =>
    setRows(p => p.map(r => {
      if (r.service.id !== sid) return r;
      return {
        ...r, editing: false,
        price_min: r.ds ? String(r.ds.price_min) : "",
        price_max: r.ds ? String(r.ds.price_max) : "",
        duration:  r.ds ? String(r.ds.duration_min) : String(r.service.base_duration_min || ""),
      };
    }));

  const updateRow = (sid: string, field: keyof Row, val: string | boolean) =>
    setRows(p => p.map(r => r.service.id === sid ? { ...r, [field]: val } : r));

  async function saveRow(r: Row) {
    const pMin = Number(r.price_min);
    const pMax = Number(r.price_max) || pMin;
    const dur  = Number(r.duration);
    if (!pMin || !dur) return;

    setSaving(r.service.id);
    try {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const data: Omit<DesignerService, "id"> = {
        service_name: r.service.name,
        price_min: pMin,
        price_max: pMax,
        duration_min: dur,
        active: r.active,
      };
      await setDesignerService(db, designerId, r.service.id, data);
      setRows(p => p.map(x =>
        x.service.id === r.service.id
          ? { ...x, editing: false, ds: { id: r.service.id, ...data } }
          : x
      ));
    } finally {
      setSaving(null);
    }
  }

  async function removeRow(sid: string) {
    const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    await deleteDesignerService(db, designerId, sid);
    setRows(p => p.map(r =>
      r.service.id === sid
        ? { ...r, ds: null, editing: false, price_min: "", price_max: "", duration: String(r.service.base_duration_min || "") }
        : r
    ));
  }

  if (loading) return <div className="p-8 text-xs text-[#1D1D1F]/30">載入中...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/designers/${designerId}`} className="text-xs text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors">
          ← 返回設計師
        </Link>
        <div>
          <h1 className="text-xl font-medium text-[#1D1D1F]">{designer?.name} — 定價矩陣</h1>
          <p className="text-xs text-[#1D1D1F]/40">設定各服務的個人定價區間與執行時長</p>
        </div>
      </div>

      <div className="bg-white border border-[#D2D2D7]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D2D2D7]">
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal">服務項目</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-28">最低價（NT$）</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-28">最高價（NT$）</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-24">時長（分）</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-16">啟用</th>
              <th className="w-36" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.service.id} className="border-t border-[#F0F0F0]">
                <td className="px-4 py-3">
                  <span className="font-medium text-[#1D1D1F]">{r.service.name}</span>
                  <span className="ml-2 text-[10px] text-[#1D1D1F]/30 uppercase tracking-wider">
                    {CATEGORY_LABEL[r.service.category]}
                  </span>
                  {r.service.description && (
                    <p className="text-xs text-[#1D1D1F]/30 mt-0.5">{r.service.description}</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  {r.editing ? (
                    <input type="number" value={r.price_min} min={0} placeholder="例：2500"
                      onChange={e => updateRow(r.service.id, "price_min", e.target.value)}
                      className="w-full border border-[#D2D2D7] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D1D1F]" />
                  ) : (
                    <span className={r.ds ? "text-[#1D1D1F]" : "text-[#1D1D1F]/20"}>
                      {r.ds ? `${r.ds.price_min.toLocaleString()}` : "—"}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {r.editing ? (
                    <input type="number" value={r.price_max} min={0} placeholder="例：4500"
                      onChange={e => updateRow(r.service.id, "price_max", e.target.value)}
                      className="w-full border border-[#D2D2D7] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D1D1F]" />
                  ) : (
                    <span className={r.ds ? "text-[#1D1D1F]" : "text-[#1D1D1F]/20"}>
                      {r.ds ? (r.ds.price_max > r.ds.price_min ? `${r.ds.price_max.toLocaleString()}` : "同上") : "—"}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {r.editing ? (
                    <input type="number" value={r.duration} min={15} step={5}
                      onChange={e => updateRow(r.service.id, "duration", e.target.value)}
                      className="w-full border border-[#D2D2D7] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D1D1F]" />
                  ) : (
                    <span className={r.ds ? "text-[#1D1D1F]" : "text-[#1D1D1F]/20"}>
                      {r.ds ? `${r.ds.duration_min}` : "—"}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {(r.editing || r.ds) && (
                    <button
                      onClick={() => updateRow(r.service.id, "active", !r.active)}
                      className={`w-8 h-4 rounded-full relative transition-colors ${r.active ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${r.active ? "left-4" : "left-0.5"}`} />
                    </button>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {r.editing ? (
                      <>
                        <button onClick={() => cancelEdit(r.service.id)}
                          className="text-[10px] px-3 py-1.5 border border-[#D2D2D7] text-[#1D1D1F]/50 hover:border-[#1D1D1F]/40 transition-colors">
                          取消
                        </button>
                        <button onClick={() => saveRow(r)}
                          disabled={saving === r.service.id || !r.price_min || !r.duration}
                          className="text-[10px] px-3 py-1.5 bg-[#1D1D1F] text-white hover:bg-black transition-colors disabled:opacity-30">
                          {saving === r.service.id ? "儲存..." : "儲存"}
                        </button>
                      </>
                    ) : (
                      <>
                        {r.ds && (
                          <button onClick={() => removeRow(r.service.id)}
                            className="text-[10px] px-3 py-1.5 text-red-400/60 hover:text-red-400 transition-colors">
                            移除
                          </button>
                        )}
                        <button onClick={() => startEdit(r.service.id)}
                          className="text-[10px] px-3 py-1.5 border border-[#D2D2D7] text-[#1D1D1F]/50 hover:border-[#1D1D1F]/40 transition-colors">
                          {r.ds ? "編輯" : "+ 設定"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-12 text-xs text-[#1D1D1F]/30">
            尚無服務項目，請先至「服務項目」頁面新增
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Designer, Service, DesignerService,
  getDesigner, getServices, getDesignerServices,
  setDesignerService, deleteDesignerService,
} from "@/lib/firestore";

type Row = {
  service: Service;
  ds: DesignerService | null;   // null = 未設定
  editing: boolean;
  price: string;
  duration: string;
  active: boolean;
};

export default function DesignerServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: designerId } = use(params);
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase");
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
          price:    ds ? String(ds.price) : "",
          duration: ds ? String(ds.duration_min) : "",
          active:   ds ? ds.active : true,
        };
      }));
      setLoading(false);
    })();
  }, [designerId]);

  function startEdit(serviceId: string) {
    setRows(prev => prev.map(r =>
      r.service.id === serviceId ? { ...r, editing: true } : r
    ));
  }

  function cancelEdit(serviceId: string) {
    setRows(prev => prev.map(r => {
      if (r.service.id !== serviceId) return r;
      return {
        ...r,
        editing: false,
        price:    r.ds ? String(r.ds.price) : "",
        duration: r.ds ? String(r.ds.duration_min) : "",
      };
    }));
  }

  async function saveRow(r: Row) {
    const price = Number(r.price);
    const duration = Number(r.duration);
    if (!price || !duration) return;

    setSaving(r.service.id);
    try {
      const { db } = await import("@/lib/firebase");
      const data: Omit<DesignerService, "id"> = {
        service_name: r.service.name,
        price,
        duration_min: duration,
        active: r.active,
      };
      await setDesignerService(db, designerId, r.service.id, data);
      setRows(prev => prev.map(x =>
        x.service.id === r.service.id
          ? { ...x, editing: false, ds: { id: r.service.id, ...data } }
          : x
      ));
    } finally {
      setSaving(null);
    }
  }

  async function removeRow(serviceId: string) {
    const { db } = await import("@/lib/firebase");
    await deleteDesignerService(db, designerId, serviceId);
    setRows(prev => prev.map(r =>
      r.service.id === serviceId
        ? { ...r, ds: null, editing: false, price: "", duration: "" }
        : r
    ));
  }

  const CATEGORY_LABEL: Record<string, string> = {
    haircut:   "剪裁",
    color:     "染燙",
    treatment: "護理",
    other:     "其他",
  };

  if (loading) return <div className="p-8 text-xs text-[#1D1D1F]/30">載入中...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard/designers" className="text-[10px] text-[#1D1D1F]/30 uppercase tracking-widest hover:text-[#1D1D1F] transition-colors">
            ← 設計師列表
          </Link>
          <h1 className="text-xl font-medium text-[#1D1D1F] mt-2">
            {designer?.name} — 定價矩陣
          </h1>
          <p className="text-xs text-[#1D1D1F]/40">設定各服務的個人定價與執行時長（分鐘）</p>
        </div>
      </div>

      {/* 定價表格 */}
      <div className="bg-white border border-[#D2D2D7]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D2D2D7]">
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal">服務項目</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-32">價格（NT$）</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-28">時長（分鐘）</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 font-normal w-20">啟用</th>
              <th className="w-36" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.service.id} className="border-t border-[#F0F0F0]">
                {/* 服務名稱 */}
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium text-[#1D1D1F]">{r.service.name}</span>
                    <span className="ml-2 text-[10px] text-[#1D1D1F]/30 uppercase tracking-wider">
                      {CATEGORY_LABEL[r.service.category]}
                    </span>
                  </div>
                  {r.service.description && (
                    <p className="text-xs text-[#1D1D1F]/30 mt-0.5">{r.service.description}</p>
                  )}
                </td>

                {/* 價格 */}
                <td className="px-4 py-3">
                  {r.editing ? (
                    <input type="number" value={r.price} min={0}
                      onChange={e => setRows(prev => prev.map(x =>
                        x.service.id === r.service.id ? { ...x, price: e.target.value } : x
                      ))}
                      className="w-full border border-[#D2D2D7] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D1D1F]"
                    />
                  ) : (
                    <span className={r.ds ? "text-[#1D1D1F]" : "text-[#1D1D1F]/20"}>
                      {r.ds ? `NT$ ${r.ds.price.toLocaleString()}` : "—"}
                    </span>
                  )}
                </td>

                {/* 時長 */}
                <td className="px-4 py-3">
                  {r.editing ? (
                    <input type="number" value={r.duration} min={0} step={5}
                      onChange={e => setRows(prev => prev.map(x =>
                        x.service.id === r.service.id ? { ...x, duration: e.target.value } : x
                      ))}
                      className="w-full border border-[#D2D2D7] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D1D1F]"
                    />
                  ) : (
                    <span className={r.ds ? "text-[#1D1D1F]" : "text-[#1D1D1F]/20"}>
                      {r.ds ? `${r.ds.duration_min} 分` : "—"}
                    </span>
                  )}
                </td>

                {/* 啟用 toggle */}
                <td className="px-4 py-3">
                  {r.ds && (
                    <button onClick={() => setRows(prev => prev.map(x =>
                        x.service.id === r.service.id ? { ...x, active: !x.active } : x
                      ))}
                      className={`w-8 h-4 rounded-full relative transition-colors
                        ${r.active ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform
                        ${r.active ? "left-4" : "left-0.5"}`} />
                    </button>
                  )}
                </td>

                {/* 操作 */}
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {r.editing ? (
                      <>
                        <button onClick={() => cancelEdit(r.service.id)}
                          className="text-[10px] px-3 py-1.5 border border-[#D2D2D7] text-[#1D1D1F]/50 hover:border-[#1D1D1F]/40 transition-colors">
                          取消
                        </button>
                        <button onClick={() => saveRow(r)}
                          disabled={saving === r.service.id || !r.price || !r.duration}
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

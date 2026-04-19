"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Designer, getDesigners, saveDesigner } from "@/lib/firestore";

const LEVEL_LABEL: Record<Designer["level"], string> = {
  junior:    "造型師",
  senior:    "資深造型師",
  director:  "院長",
};

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { db } = await import("@/lib/firebase");
    const data = await getDesigners(db);
    setDesigners(data);
    setLoading(false);
  }

  async function toggleActive(d: Designer) {
    const { db } = await import("@/lib/firebase");
    await saveDesigner(db, { ...d, active: !d.active }, d.id);
    setDesigners(prev => prev.map(x => x.id === d.id ? { ...x, active: !x.active } : x));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">設計師管理</h1>
          <p className="text-xs text-[#1D1D1F]/40">管理設計師資料與服務定價</p>
        </div>
        <Link href="/dashboard/designers/new"
          className="bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 hover:bg-black transition-colors">
          + 新增設計師
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-[#1D1D1F]/30 text-center py-20">載入中...</p>
      ) : designers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#D2D2D7]">
          <p className="text-sm text-[#1D1D1F]/40 mb-4">尚未新增設計師</p>
          <Link href="/dashboard/designers/new"
            className="text-xs underline text-[#1D1D1F]/50 hover:text-[#1D1D1F] transition-colors">
            立即新增
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {designers.map(d => (
            <div key={d.id} className="bg-white border border-[#D2D2D7] p-4 flex items-center gap-4">
              {/* 照片 */}
              <div className="w-12 h-12 shrink-0 overflow-hidden bg-[#F5F5F7]">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover grayscale" />
                  : <div className="w-full h-full flex items-center justify-center text-[#1D1D1F]/20 text-xs">
                      {d.name[0]}
                    </div>
                }
              </div>

              {/* 資訊 */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[#1D1D1F]">{d.name}</span>
                  <span className="text-[10px] text-[#1D1D1F]/40">{d.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 tracking-wider
                    ${d.level === "director" ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-[#1D1D1F]/50"}`}>
                    {LEVEL_LABEL[d.level]}
                  </span>
                </div>
                {d.bio && <p className="text-xs text-[#1D1D1F]/40 mt-0.5 line-clamp-1">{d.bio}</p>}
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleActive(d)}
                  className={`text-[10px] px-3 py-1 border tracking-wide transition-colors
                    ${d.active
                      ? "border-green-200 text-green-600 hover:border-red-200 hover:text-red-400"
                      : "border-[#D2D2D7] text-[#1D1D1F]/30 hover:border-green-200 hover:text-green-500"
                    }`}>
                  {d.active ? "啟用中" : "已停用"}
                </button>
                <Link href={`/dashboard/designers/${d.id}/services`}
                  className="text-[10px] px-3 py-1 border border-[#D2D2D7] text-[#1D1D1F]/50 tracking-wide hover:border-[#1D1D1F]/40 transition-colors">
                  定價矩陣
                </Link>
                <Link href={`/dashboard/designers/${d.id}`}
                  className="text-[10px] px-3 py-1 bg-[#F5F5F7] text-[#1D1D1F]/60 tracking-wide hover:bg-[#E5E5E5] transition-colors">
                  編輯
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

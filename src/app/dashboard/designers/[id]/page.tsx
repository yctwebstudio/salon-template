"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { Designer, getDesigner } from "@/lib/firestore";
import DesignerForm from "../_DesignerForm";

export default function EditDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [designer, setDesigner] = useState<Designer | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { db } = await import("@/lib/firebase");
      const data = await getDesigner(db, id);
      setDesigner(data);
    })();
  }, [id]);

  if (designer === undefined) {
    return <div className="p-8 text-xs text-[#1D1D1F]/30">載入中...</div>;
  }
  if (designer === null) {
    return <div className="p-8 text-xs text-red-400">找不到此設計師</div>;
  }

  return <DesignerForm initial={designer} />;
}

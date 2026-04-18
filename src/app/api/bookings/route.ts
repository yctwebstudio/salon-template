export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// ── 預約 Schema ──────────────────────────────────────────
const bookingSchema = z.object({
  serviceId:    z.string().min(1),
  serviceName:  z.string().min(1),
  serviceItem:  z.string().optional().default(""),
  designerId:   z.string().optional().default(""),
  designerName: z.string().optional().default("不指定"),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:         z.string().min(1),
  name:         z.string().min(2),
  phone:        z.string().min(6),
  notes:        z.string().optional().default(""),
});

// ── POST — 新增預約 ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 驗證 Firebase ID token（匿名用戶亦可）
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }
    await adminAuth.verifyIdToken(authHeader.slice(7));

    const body = await req.json();
    const data = bookingSchema.parse(body);

    // 日期不可早於今天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(data.date + "T00:00:00");
    if (appointmentDate < today) {
      return NextResponse.json({ error: "日期不得早於今天" }, { status: 400 });
    }

    // 寫入 Firestore
    await adminDb.collection("bookings").add({
      ...data,
      status: "pending",   // pending | confirmed | cancelled
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 422 });
    }
    console.error("[POST /api/bookings]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// ── GET — 讀取所有預約（需管理員 token）─────────────────
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    // 只有 STORE_OWNER_EMAIL 才可讀取
    if (decoded.email !== process.env.STORE_OWNER_EMAIL) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const snap = await adminDb
      .collection("bookings")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const bookings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("[GET /api/bookings]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

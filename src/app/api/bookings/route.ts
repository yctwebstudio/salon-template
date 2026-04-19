export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// ── Schema ───────────────────────────────────────────────────
const bookingSchema = z.object({
  customer_name:  z.string().min(2),
  customer_phone: z.string().min(6),
  customer_email: z.string().email().optional().default(""),
  designer_id:    z.string().optional().default(""),
  designer_name:  z.string().optional().default("不指定"),
  service_id:     z.string().min(1),
  service_name:   z.string().min(1),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time:     z.string().min(1),
  duration_min:   z.number().int().positive(),
  price:          z.number().min(0).optional().default(0),
  notes:          z.string().optional().default(""),
});

// ── POST：新增預約 ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
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
    if (new Date(data.date + "T00:00:00") < today) {
      return NextResponse.json({ error: "日期不得早於今天" }, { status: 400 });
    }

    // 計算 end_time
    const [h, m] = data.start_time.split(":").map(Number);
    const endMin = h * 60 + m + data.duration_min;
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    // 衝突檢查（同設計師同日）
    if (data.designer_id) {
      const existing = await adminDb.collection("bookings")
        .where("designer_id", "==", data.designer_id)
        .where("date", "==", data.date)
        .where("status", "in", ["pending", "confirmed"])
        .get();

      const newStart = h * 60 + m;
      const newEnd = newStart + data.duration_min;
      const conflict = existing.docs.some(doc => {
        const b = doc.data();
        const bStart = timeToMin(b.start_time);
        const bEnd = timeToMin(b.end_time);
        return newStart < bEnd && newEnd > bStart;
      });
      if (conflict) {
        return NextResponse.json({ error: "此時段已被預約，請選擇其他時間" }, { status: 409 });
      }
    }

    // 寫入 bookings
    await adminDb.collection("bookings").add({
      ...data,
      end_time,
      internal_notes: "",
      cancelled_reason: "",
      reminder_sent: false,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // upsert 客戶資料庫
    const customerRef = adminDb.collection("customers").doc(data.customer_phone);
    const customerSnap = await customerRef.get();
    if (customerSnap.exists) {
      await customerRef.update({
        name: data.customer_name,
        last_visit_at: FieldValue.serverTimestamp(),
        visit_count: (customerSnap.data()?.visit_count ?? 0) + 1,
      });
    } else {
      await customerRef.set({
        phone: data.customer_phone,
        name: data.customer_name,
        email: data.customer_email,
        notes: "",
        visit_count: 1,
        created_at: FieldValue.serverTimestamp(),
        last_visit_at: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 422 });
    }
    console.error("[POST /api/bookings]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// ── GET：讀取預約（需管理員）─────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    if (decoded.email !== process.env.STORE_OWNER_EMAIL) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const designerId = searchParams.get("designer_id");
    const status = searchParams.get("status");

    let q = adminDb.collection("bookings")
      .orderBy("date", "desc")
      .orderBy("start_time", "asc")
      .limit(200);

    if (date)       q = q.where("date", "==", date) as typeof q;
    if (designerId) q = q.where("designer_id", "==", designerId) as typeof q;
    if (status)     q = q.where("status", "==", status) as typeof q;

    const snap = await q.get();
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("[GET /api/bookings]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// ── PATCH：更新預約狀態 ───────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    if (decoded.email !== process.env.STORE_OWNER_EMAIL) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, internal_notes, price, cancelled_reason } = body;

    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: FieldValue.serverTimestamp() };
    if (status)           updateData.status = status;
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes;
    if (price !== undefined)          updateData.price = price;
    if (cancelled_reason) {
      updateData.cancelled_reason = cancelled_reason;
      updateData.cancelled_at = FieldValue.serverTimestamp();
    }

    await adminDb.collection("bookings").doc(id).update(updateData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/bookings]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// ── helper ────────────────────────────────────────────────────
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// 客戶自助取消：驗證 Google token + 確認是本人的預約
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    if (!decoded.email) {
      return NextResponse.json({ error: "需要 Google 帳號" }, { status: 401 });
    }

    const bookingRef = adminDb.collection("bookings").doc(id);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
    }

    const booking = snap.data()!;

    // 驗證是本人預約
    if (booking.customer_email !== decoded.email) {
      return NextResponse.json({ error: "無權取消此預約" }, { status: 403 });
    }

    // 只允許取消 pending 或 confirmed 狀態
    if (!["pending", "confirmed"].includes(booking.status)) {
      return NextResponse.json({ error: "此預約狀態無法取消" }, { status: 400 });
    }

    // 取消限制時數（從 settings 讀取）
    const settingsSnap = await adminDb.collection("settings").doc("booking").get();
    const cancellationHours: number = settingsSnap.exists
      ? (settingsSnap.data()?.cancellation_hours ?? 24)
      : 24;

    // 檢查是否超過取消期限
    const bookingDateTime = new Date(`${booking.date}T${booking.start_time}:00`);
    const nowMs = Date.now();
    const diffHours = (bookingDateTime.getTime() - nowMs) / 3600000;
    if (diffHours < cancellationHours) {
      return NextResponse.json(
        { error: `預約開始前 ${cancellationHours} 小時內無法自行取消，請致電店家` },
        { status: 400 },
      );
    }

    await bookingRef.update({
      status: "cancelled",
      cancelled_reason: "客戶自行取消",
      cancelled_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/bookings/[id]/cancel]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

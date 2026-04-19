"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SALON_CONFIG } from "@/config";
import { type Booking, BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/firestore";

type FirebaseUser = { email: string | null; displayName: string | null; getIdToken(): Promise<string> };

function isFuture(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date + "T00:00:00") >= today;
}

export default function MyBookingsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Auth 狀態監聽
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u as FirebaseUser | null);
        setAuthChecked(true);
      });
    })();
    return () => unsub?.();
  }, []);

  // 登入後載入預約
  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { db } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { getDocs, collection, query, where, orderBy } = await import("firebase/firestore");
      const snap = await getDocs(
        query(
          collection(db, "bookings"),
          where("customer_email", "==", user.email),
          orderBy("date", "desc"),
        ),
      );
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      setBookings(data);
      setLoading(false);
    })();
  }, [user]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch { /* 使用者取消 */ } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    const { auth } = await import("@/lib/firebase").then(m => m.getFirebaseApp());
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
  }

  async function handleCancel(booking: Booking) {
    if (!confirm(`確定要取消「${booking.service_name}」的預約嗎？`)) return;
    setCancellingId(booking.id);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) { alert(body.error ?? "取消失敗，請再試一次"); return; }
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" as const } : b));
    } catch { alert("網路錯誤，請再試一次"); } finally {
      setCancellingId(null);
    }
  }

  // Loading auth
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-xs text-[#1D1D1F]/30 tracking-widest uppercase">Loading...</p>
      </main>
    );
  }

  // 未登入
  if (!user) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-[#1D1D1F] mb-1">{SALON_CONFIG.name}</p>
          <h1 className="text-xl font-light text-[#1D1D1F] mb-2 mt-6">查看我的預約</h1>
          <p className="text-sm text-[#1D1D1F]/40 mb-8">使用預約時的 Google 帳號登入</p>
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-[#D2D2D7] px-4 py-3.5 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors disabled:opacity-50">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "登入中..." : "使用 Google 登入"}
          </button>
          <p className="mt-6 text-xs text-[#1D1D1F]/40">
            尚未預約？{" "}
            <Link href="/book" className="underline hover:text-[#1D1D1F] transition-colors">立即預約</Link>
          </p>
        </div>
      </main>
    );
  }

  const upcoming = bookings.filter(b => isFuture(b.date) && b.status !== "cancelled");
  const past = bookings.filter(b => !isFuture(b.date) || b.status === "cancelled");

  return (
    <main className="min-h-screen bg-[#F5F5F7]">
      {/* Nav */}
      <nav className="bg-white border-b border-[#D2D2D7] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors">
          ← 返回
        </Link>
        <span className="text-sm font-bold tracking-[0.15em] text-[#1D1D1F]">{SALON_CONFIG.name}</span>
        <button onClick={handleSignOut} className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors">
          登出
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-xl font-medium text-[#1D1D1F] mb-1">我的預約</h1>
          <p className="text-xs text-[#1D1D1F]/40">{user.displayName ?? user.email}</p>
        </div>

        {loading ? (
          <p className="text-xs text-[#1D1D1F]/30 text-center py-20">載入中...</p>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] text-center py-20">
            <p className="text-sm text-[#1D1D1F]/40 mb-4">目前沒有預約記錄</p>
            <Link href="/book" className="text-xs underline text-[#1D1D1F]/50 hover:text-[#1D1D1F] transition-colors">
              立即預約
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section>
                <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">即將到來</p>
                <div className="space-y-3">
                  {upcoming.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancellingId={cancellingId} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="opacity-70">
                <p className="text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-3">過去紀錄</p>
                <div className="space-y-3">
                  {past.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancellingId={cancellingId} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function BookingCard({
  booking: b,
  onCancel,
  cancellingId,
}: {
  booking: Booking;
  onCancel: (b: Booking) => void;
  cancellingId: string | null;
}) {
  const canCancel = ["pending", "confirmed"].includes(b.status) && isFuture(b.date);
  return (
    <div className="bg-white border border-[#D2D2D7] p-5 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-sm text-[#1D1D1F]">{b.service_name}</span>
          <span className="text-[#1D1D1F]/30">·</span>
          <span className="text-xs text-[#1D1D1F]/60">{b.designer_name || "不指定設計師"}</span>
        </div>
        <p className="text-xs text-[#1D1D1F]/50">{b.date} {b.start_time}</p>
        {b.notes && <p className="text-xs text-[#1D1D1F]/40 mt-1 truncate">{b.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] px-2.5 py-1 tracking-wide font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>
          {BOOKING_STATUS_LABEL[b.status]}
        </span>
        {canCancel && (
          <button onClick={() => onCancel(b)} disabled={cancellingId === b.id}
            className="text-[10px] px-3 py-1 border border-[#D2D2D7] text-[#1D1D1F]/40 hover:border-red-300 hover:text-red-400 transition-colors disabled:opacity-40">
            {cancellingId === b.id ? "取消中..." : "取消"}
          </button>
        )}
      </div>
    </div>
  );
}

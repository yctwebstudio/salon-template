// ══════════════════════════════════════════════════════════════
//  Firestore 型別定義 + helper functions
// ══════════════════════════════════════════════════════════════

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from "firebase/firestore";

// ── 型別 ──────────────────────────────────────────────────────

export type DesignerLevel = "junior" | "senior" | "director";

export interface Designer {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string;
  level: DesignerLevel;
  active: boolean;
  created_at?: Timestamp;
}

export interface Service {
  id: string;
  name: string;
  category: "haircut" | "color" | "treatment" | "other";
  description: string;
  active: boolean;
}

// 子集合：designers/{id}/services/{serviceId}
export interface DesignerService {
  id: string;           // = Service.id
  service_name: string; // denormalized for display
  price: number;
  duration_min: number;
  active: boolean;
}

// 子集合：schedules/{designerId}/weekdays/{0-6}
export interface WeekdaySchedule {
  weekday: number;      // 0 = 日, 1 = 一 ... 6 = 六
  start_time: string;   // "10:00"
  end_time: string;     // "18:00"
  is_off: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  id: string;
  designer_id: string;
  designer_name: string;
  service_id: string;
  service_name: string;
  service_item: string;
  customer_name: string;
  customer_phone: string;
  date: string;           // "2026-04-20"
  start_time: string;     // "14:00"
  end_time: string;       // "15:30"
  duration_min: number;
  status: BookingStatus;
  notes: string;
  created_at?: Timestamp;
}

export interface BookingSettings {
  buffer_min: number;     // 預約之間的緩衝時間（分鐘）
}

// ── Designers ────────────────────────────────────────────────

export async function getDesigners(db: ReturnType<typeof import("firebase/firestore").getFirestore>) {
  const snap = await getDocs(query(collection(db, "designers"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Designer));
}

export async function getDesigner(db: ReturnType<typeof import("firebase/firestore").getFirestore>, id: string) {
  const snap = await getDoc(doc(db, "designers", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Designer;
}

export async function saveDesigner(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  data: Omit<Designer, "id" | "created_at">,
  id?: string,
) {
  if (id) {
    await updateDoc(doc(db, "designers", id), { ...data });
    return id;
  } else {
    const ref = await addDoc(collection(db, "designers"), {
      ...data,
      created_at: serverTimestamp(),
    });
    return ref.id;
  }
}

// ── Services ─────────────────────────────────────────────────

export async function getServices(db: ReturnType<typeof import("firebase/firestore").getFirestore>) {
  const snap = await getDocs(query(collection(db, "services"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
}

export async function saveService(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  data: Omit<Service, "id">,
  id?: string,
) {
  if (id) {
    await updateDoc(doc(db, "services", id), { ...data });
    return id;
  } else {
    const ref = await addDoc(collection(db, "services"), data);
    return ref.id;
  }
}

// ── Designer Services（定價矩陣）──────────────────────────────

export async function getDesignerServices(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  designerId: string,
) {
  const snap = await getDocs(collection(db, "designers", designerId, "services"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DesignerService));
}

export async function setDesignerService(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  designerId: string,
  serviceId: string,
  data: Omit<DesignerService, "id">,
) {
  await setDoc(doc(db, "designers", designerId, "services", serviceId), data);
}

export async function deleteDesignerService(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  designerId: string,
  serviceId: string,
) {
  await deleteDoc(doc(db, "designers", designerId, "services", serviceId));
}

// ── Schedules（班表）─────────────────────────────────────────

export async function getSchedules(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  designerId: string,
) {
  const snap = await getDocs(collection(db, "schedules", designerId, "weekdays"));
  return snap.docs.map(d => ({ weekday: Number(d.id), ...d.data() } as WeekdaySchedule));
}

export async function setSchedule(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  designerId: string,
  schedule: WeekdaySchedule,
) {
  await setDoc(
    doc(db, "schedules", designerId, "weekdays", String(schedule.weekday)),
    { start_time: schedule.start_time, end_time: schedule.end_time, is_off: schedule.is_off },
  );
}

// ── Bookings ─────────────────────────────────────────────────

export async function getBookings(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  filters?: { designerId?: string; date?: string; status?: BookingStatus },
) {
  let q = query(collection(db, "bookings"), orderBy("date", "desc"), orderBy("start_time", "asc"));

  if (filters?.designerId) {
    q = query(q, where("designer_id", "==", filters.designerId));
  }
  if (filters?.date) {
    q = query(q, where("date", "==", filters.date));
  }
  if (filters?.status) {
    q = query(q, where("status", "==", filters.status));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function updateBookingStatus(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  bookingId: string,
  status: BookingStatus,
) {
  await updateDoc(doc(db, "bookings", bookingId), { status });
}

// ── Settings ─────────────────────────────────────────────────

export async function getBookingSettings(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
): Promise<BookingSettings> {
  const snap = await getDoc(doc(db, "settings", "booking"));
  if (!snap.exists()) return { buffer_min: 15 };
  return snap.data() as BookingSettings;
}

export async function saveBookingSettings(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>,
  data: BookingSettings,
) {
  await setDoc(doc(db, "settings", "booking"), data);
}

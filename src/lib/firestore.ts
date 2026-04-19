// ══════════════════════════════════════════════════════════════
//  Firestore 型別定義 + helper functions
// ══════════════════════════════════════════════════════════════

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, serverTimestamp,
  type Firestore,
} from "firebase/firestore";

// ── 型別 ──────────────────────────────────────────────────────

export type DesignerLevel = "junior" | "senior" | "principal";

export interface Designer {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string;
  level: DesignerLevel;
  specialties: string[];   // ["剪髮", "染髮", "燙髮"]
  instagram: string;
  line_id: string;
  active: boolean;
  join_date: string;       // "2024-01-01"
  created_at?: Timestamp;
}

export interface Service {
  id: string;
  name: string;
  category: "haircut" | "color" | "perm" | "treatment" | "other";
  description: string;
  base_duration_min: number;
  base_price_min: number;   // 不指定設計師時的公版最低價
  base_price_max: number;   // 不指定設計師時的公版最高價（0 = 同上）
  sort_order: number;
  active: boolean;
}

// 子集合：designers/{id}/services/{serviceId}
export interface DesignerService {
  id: string;
  service_name: string;
  price_min: number;
  price_max: number;
  duration_min: number;
  active: boolean;
}

// 子集合：designers/{id}/schedules/{0-6}  (0=週日)
export interface WeekdaySchedule {
  day_of_week: number;
  is_working: boolean;
  start_time: string;    // "10:00"
  end_time: string;      // "19:00"
  break_start: string;   // "13:00"（空字串代表無午休）
  break_end: string;     // "14:00"
}

// 子集合：designers/{id}/exceptions/{YYYY-MM-DD}
export type ExceptionType = "day_off" | "vacation" | "special_hours";

export interface ScheduleException {
  date: string;
  type: ExceptionType;
  start_time?: string;
  end_time?: string;
  note: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   "待確認",
  confirmed: "已確認",
  completed: "已完成",
  no_show:   "未到場",
  cancelled: "已取消",
};

export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  no_show:   "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  designer_id: string;
  designer_name: string;
  service_id: string;
  service_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  price: number;
  notes: string;
  internal_notes: string;
  status: BookingStatus;
  cancelled_reason: string;
  cancelled_at?: Timestamp;
  reminder_sent: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Customer {
  phone: string;
  name: string;
  email: string;
  notes: string;
  visit_count: number;
  created_at?: Timestamp;
  last_visit_at?: Timestamp;
}

export interface BookingSettings {
  buffer_min: number;
  advance_booking_days: number;
  min_advance_hours: number;
  cancellation_hours: number;
  slot_interval_min: number;
}

// ── Designers ─────────────────────────────────────────────────

export async function getDesigners(db: Firestore) {
  const snap = await getDocs(query(collection(db, "designers"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Designer));
}

export async function getDesigner(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "designers", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Designer;
}

export async function saveDesigner(
  db: Firestore,
  data: Omit<Designer, "id" | "created_at">,
  id?: string,
) {
  if (id) {
    await updateDoc(doc(db, "designers", id), { ...data, updated_at: serverTimestamp() });
    return id;
  } else {
    const ref = await addDoc(collection(db, "designers"), {
      ...data,
      created_at: serverTimestamp(),
    });
    return ref.id;
  }
}

// ── Services ──────────────────────────────────────────────────

export async function getServices(db: Firestore) {
  const snap = await getDocs(query(collection(db, "services"), orderBy("sort_order")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
}

export async function saveService(db: Firestore, data: Omit<Service, "id">, id?: string) {
  if (id) {
    await updateDoc(doc(db, "services", id), { ...data });
    return id;
  } else {
    const ref = await addDoc(collection(db, "services"), data);
    return ref.id;
  }
}

// ── Designer Services（定價矩陣）──────────────────────────────

export async function getDesignerServices(db: Firestore, designerId: string) {
  const snap = await getDocs(collection(db, "designers", designerId, "services"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DesignerService));
}

export async function setDesignerService(
  db: Firestore,
  designerId: string,
  serviceId: string,
  data: Omit<DesignerService, "id">,
) {
  await setDoc(doc(db, "designers", designerId, "services", serviceId), data);
}

export async function deleteDesignerService(db: Firestore, designerId: string, serviceId: string) {
  await deleteDoc(doc(db, "designers", designerId, "services", serviceId));
}

// ── Weekly Schedule（週排班）─────────────────────────────────

export async function getWeeklySchedule(db: Firestore, designerId: string) {
  const snap = await getDocs(collection(db, "designers", designerId, "schedules"));
  return snap.docs.map(d => ({ day_of_week: Number(d.id), ...d.data() } as WeekdaySchedule));
}

export async function setDaySchedule(db: Firestore, designerId: string, schedule: WeekdaySchedule) {
  await setDoc(
    doc(db, "designers", designerId, "schedules", String(schedule.day_of_week)),
    {
      is_working: schedule.is_working,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start,
      break_end: schedule.break_end,
    },
  );
}

// ── Schedule Exceptions（特殊例外）───────────────────────────

export async function getExceptions(db: Firestore, designerId: string, fromDate?: string) {
  const constraints: Parameters<typeof query>[1][] = [orderBy("date")];
  if (fromDate) constraints.push(where("date", ">=", fromDate));
  const snap = await getDocs(query(collection(db, "designers", designerId, "exceptions"), ...constraints));
  return snap.docs.map(d => d.data() as ScheduleException);
}

export async function setException(db: Firestore, designerId: string, ex: ScheduleException) {
  await setDoc(doc(db, "designers", designerId, "exceptions", ex.date), ex);
}

export async function deleteException(db: Firestore, designerId: string, date: string) {
  await deleteDoc(doc(db, "designers", designerId, "exceptions", date));
}

// ── Bookings ──────────────────────────────────────────────────

export async function getBookings(
  db: Firestore,
  filters?: { designerId?: string; date?: string; status?: BookingStatus },
) {
  const constraints: Parameters<typeof query>[1][] = [
    orderBy("date", "desc"),
    orderBy("start_time", "asc"),
  ];
  if (filters?.designerId) constraints.push(where("designer_id", "==", filters.designerId));
  if (filters?.date)       constraints.push(where("date", "==", filters.date));
  if (filters?.status)     constraints.push(where("status", "==", filters.status));

  const snap = await getDocs(query(collection(db, "bookings"), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBookingsByDateRange(db: Firestore, from: string, to: string) {
  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("date", ">=", from),
      where("date", "<=", to),
      orderBy("date", "asc"),
      orderBy("start_time", "asc"),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBooking(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "bookings", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Booking;
}

export async function updateBooking(db: Firestore, id: string, data: Partial<Booking>) {
  await updateDoc(doc(db, "bookings", id), { ...data, updated_at: serverTimestamp() });
}

export async function cancelBooking(db: Firestore, id: string, reason: string) {
  await updateDoc(doc(db, "bookings", id), {
    status: "cancelled" as BookingStatus,
    cancelled_reason: reason,
    cancelled_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

// ── Customers ─────────────────────────────────────────────────

export async function getCustomers(db: Firestore) {
  const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
  return snap.docs.map(d => ({ phone: d.id, ...d.data() } as Customer));
}

export async function getCustomer(db: Firestore, phone: string) {
  const snap = await getDoc(doc(db, "customers", phone));
  if (!snap.exists()) return null;
  return { phone: snap.id, ...snap.data() } as Customer;
}

export async function upsertCustomer(db: Firestore, data: Omit<Customer, "created_at" | "last_visit_at">) {
  const ref = doc(db, "customers", data.phone);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { name: data.name, email: data.email, notes: data.notes, last_visit_at: serverTimestamp() });
  } else {
    await setDoc(ref, { ...data, created_at: serverTimestamp(), last_visit_at: serverTimestamp() });
  }
}

export async function getCustomerBookings(db: Firestore, phone: string) {
  const snap = await getDocs(
    query(collection(db, "bookings"), where("customer_phone", "==", phone), orderBy("date", "desc"), limit(20)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

// ── Settings ──────────────────────────────────────────────────

const DEFAULT_SETTINGS: BookingSettings = {
  buffer_min: 15,
  advance_booking_days: 30,
  min_advance_hours: 2,
  cancellation_hours: 24,
  slot_interval_min: 30,
};

export async function getBookingSettings(db: Firestore): Promise<BookingSettings> {
  const snap = await getDoc(doc(db, "settings", "booking"));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...snap.data() } as BookingSettings;
}

export async function saveBookingSettings(db: Firestore, data: BookingSettings) {
  await setDoc(doc(db, "settings", "booking"), data);
}

// ── 時段計算工具 ───────────────────────────────────────────────

export function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function calcAvailableSlots(params: {
  schedule: WeekdaySchedule | null;
  exception: ScheduleException | null;
  existingBookings: Booking[];
  durationMin: number;
  bufferMin: number;
  slotIntervalMin: number;
}): string[] {
  const { schedule, exception, existingBookings, durationMin, bufferMin, slotIntervalMin } = params;

  // 當天休假或不上班
  if (exception?.type === "day_off" || exception?.type === "vacation") return [];
  if (!schedule?.is_working && !exception) return [];

  let workStart: number;
  let workEnd: number;
  let breakStart = 0;
  let breakEnd = 0;

  if (exception?.type === "special_hours" && exception.start_time && exception.end_time) {
    workStart = timeToMin(exception.start_time);
    workEnd = timeToMin(exception.end_time);
  } else if (schedule) {
    workStart = timeToMin(schedule.start_time);
    workEnd = timeToMin(schedule.end_time);
    if (schedule.break_start && schedule.break_end) {
      breakStart = timeToMin(schedule.break_start);
      breakEnd = timeToMin(schedule.break_end);
    }
  } else {
    return [];
  }

  // 已佔用時段（含緩衝）
  const blocked = existingBookings
    .filter(b => b.status !== "cancelled")
    .map(b => ({
      s: timeToMin(b.start_time) - bufferMin,
      e: timeToMin(b.end_time) + bufferMin,
    }));

  const slots: string[] = [];
  let cursor = workStart;

  while (cursor + durationMin <= workEnd) {
    const slotEnd = cursor + durationMin;
    const inBreak = breakStart > 0 && cursor < breakEnd && slotEnd > breakStart;
    const conflict = blocked.some(b => cursor < b.e && slotEnd > b.s);

    if (!inBreak && !conflict) slots.push(minToTime(cursor));
    cursor += slotIntervalMin;
  }

  return slots;
}

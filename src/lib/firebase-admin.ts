import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// 向下相容舊式用法（lazy getter）
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_t, prop) {
    return (getAdminDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_t, prop) {
    return (getAdminAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

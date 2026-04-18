"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SALON_CONFIG } from "@/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { auth } = await import("@/lib/firebase");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch {
      setError("帳號或密碼錯誤，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-sm font-bold tracking-[0.15em] text-[#1D1D1F] mb-1">
            {SALON_CONFIG.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#1D1D1F]/40">
            管理後台登入
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-[#1D1D1F]/40 mb-2">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#D2D2D7] px-4 py-3 text-sm focus:outline-none focus:border-[#1D1D1F] transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1F] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-black transition-colors disabled:opacity-40"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "로그인에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-orange-100 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold text-orange-900 dark:text-orange-100">
          <span className="text-2xl">🍚</span> 집밥 레시피
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          비밀번호를 입력하세요.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded-lg border border-orange-100 bg-transparent px-4 py-3 text-base outline-none focus:border-orange-400 dark:border-zinc-700 dark:focus:border-orange-500"
        />
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-3 text-base font-medium text-white transition-opacity disabled:opacity-40"
        >
          {submitting ? "확인 중..." : "입장하기"}
        </button>
      </form>
    </div>
  );
}

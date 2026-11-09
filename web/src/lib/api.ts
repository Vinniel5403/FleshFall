"use client";

import { useEffect, useState } from "react";

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  if (!res.ok && res.status >= 500) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

/** Fetch once on mount. `error` is set when the bot API is unreachable. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api<T>(path)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError("ติดต่อเซิร์ฟเวอร์เกมไม่ได้ — รัน `npm run api` ที่ root ก่อน"));
    return () => {
      alive = false;
    };
  }, [path]);
  return { data, error };
}
